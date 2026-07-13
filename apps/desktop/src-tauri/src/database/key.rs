use std::{
    fs::{self, OpenOptions},
    path::Path,
};

use keyring::Entry;
use rand::RngCore;
use secrecy::{ExposeSecret, SecretBox};
use thiserror::Error;
use zeroize::Zeroizing;

const SERVICE: &str = "Orbe";
const ACCOUNT: &str = "local-database-key";
const KEY_BYTES: usize = 32;

pub struct DatabaseKey(SecretBox<[u8; KEY_BYTES]>);

impl DatabaseKey {
    pub fn expose_bytes(&self) -> &[u8; KEY_BYTES] {
        self.0.expose_secret()
    }
}

pub trait CredentialStore {
    fn get(&self) -> Result<Option<Zeroizing<String>>, KeyError>;
    fn set(&self, value: &str) -> Result<(), KeyError>;
}

pub struct WindowsCredentialStore;

impl CredentialStore for WindowsCredentialStore {
    fn get(&self) -> Result<Option<Zeroizing<String>>, KeyError> {
        let entry = Entry::new(SERVICE, ACCOUNT).map_err(|_| KeyError::CredentialStore)?;
        match entry.get_password() {
            Ok(value) => Ok(Some(Zeroizing::new(value))),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err(KeyError::CredentialStore),
        }
    }

    fn set(&self, value: &str) -> Result<(), KeyError> {
        Entry::new(SERVICE, ACCOUNT)
            .map_err(|_| KeyError::CredentialStore)?
            .set_password(value)
            .map_err(|_| KeyError::CredentialStore)
    }
}

pub fn load_or_create(
    store: &impl CredentialStore,
    lock_path: &Path,
) -> Result<DatabaseKey, KeyError> {
    if let Some(parent) = lock_path.parent() {
        fs::create_dir_all(parent).map_err(|_| KeyError::InitializationLock)?;
    }
    let lock_file = OpenOptions::new()
        .create(true)
        .read(true)
        .write(true)
        .open(lock_path)
        .map_err(|_| KeyError::InitializationLock)?;
    lock_file.lock().map_err(|_| KeyError::InitializationLock)?;

    if let Some(encoded_key) = store.get()? {
        return decode_key(&encoded_key);
    }

    let mut bytes = Zeroizing::new([0_u8; KEY_BYTES]);
    rand::rngs::OsRng
        .try_fill_bytes(&mut *bytes)
        .map_err(|_| KeyError::RandomSource)?;
    let encoded_key = Zeroizing::new(hex::encode(&*bytes));
    store.set(encoded_key.as_str())?;
    Ok(DatabaseKey(SecretBox::new(Box::new(*bytes))))
}

fn decode_key(encoded_key: &str) -> Result<DatabaseKey, KeyError> {
    if encoded_key.len() != KEY_BYTES * 2 {
        return Err(KeyError::InvalidStoredKey);
    }
    let mut bytes = Zeroizing::new([0_u8; KEY_BYTES]);
    hex::decode_to_slice(encoded_key, &mut *bytes).map_err(|_| KeyError::InvalidStoredKey)?;
    Ok(DatabaseKey(SecretBox::new(Box::new(*bytes))))
}

#[derive(Debug, Error)]
pub enum KeyError {
    #[error("credential store is unavailable")]
    CredentialStore,
    #[error("stored database key is invalid")]
    InvalidStoredKey,
    #[error("operating-system random source is unavailable")]
    RandomSource,
    #[error("database-key initialization lock is unavailable")]
    InitializationLock,
}

#[cfg(test)]
mod tests {
    use std::{
        sync::{
            atomic::{AtomicUsize, Ordering},
            Arc, Barrier, Mutex,
        },
        thread,
        time::Duration,
    };

    use tempfile::tempdir;
    use zeroize::Zeroizing;

    use super::{load_or_create, CredentialStore, KeyError};

    #[derive(Default)]
    struct MemoryCredentialStore(Mutex<Option<String>>);

    impl CredentialStore for MemoryCredentialStore {
        fn get(&self) -> Result<Option<Zeroizing<String>>, KeyError> {
            Ok(self
                .0
                .lock()
                .expect("memory credential lock")
                .clone()
                .map(Zeroizing::new))
        }

        fn set(&self, value: &str) -> Result<(), KeyError> {
            *self.0.lock().expect("memory credential lock") = Some(value.to_owned());
            Ok(())
        }
    }

    #[test]
    fn creates_and_reuses_one_random_32_byte_key_through_the_store_boundary() {
        let store = MemoryCredentialStore::default();
        let directory = tempdir().expect("temporary key lock directory");
        let lock_path = directory.path().join("database-key.lock");

        let created = load_or_create(&store, &lock_path).expect("key should be created");
        let loaded = load_or_create(&store, &lock_path).expect("key should be loaded");

        assert_eq!(created.expose_bytes().len(), 32);
        assert_eq!(created.expose_bytes(), loaded.expose_bytes());
        assert_eq!(
            store
                .0
                .lock()
                .expect("memory credential lock")
                .as_ref()
                .expect("encoded key")
                .len(),
            64
        );
    }

    #[derive(Default)]
    struct RacingCredentialState {
        value: Mutex<Option<String>>,
        missing_reads: AtomicUsize,
        set_count: AtomicUsize,
    }

    struct RacingCredentialStore {
        state: Arc<RacingCredentialState>,
    }

    impl CredentialStore for RacingCredentialStore {
        fn get(&self) -> Result<Option<Zeroizing<String>>, KeyError> {
            let value = self
                .state
                .value
                .lock()
                .expect("racing credential lock")
                .clone();
            if value.is_none() {
                self.state.missing_reads.fetch_add(1, Ordering::SeqCst);
                thread::sleep(Duration::from_millis(75));
            }
            Ok(value.map(Zeroizing::new))
        }

        fn set(&self, value: &str) -> Result<(), KeyError> {
            self.state.set_count.fetch_add(1, Ordering::SeqCst);
            *self.state.value.lock().expect("racing credential lock") = Some(value.to_owned());
            Ok(())
        }
    }

    #[test]
    fn two_independent_handles_initialize_exactly_one_database_key() {
        let directory = tempdir().expect("temporary key lock directory");
        let lock_path = directory.path().join("database-key.lock");
        let state = Arc::new(RacingCredentialState::default());
        let start = Arc::new(Barrier::new(3));

        let handles = (0..2)
            .map(|_| {
                let store = RacingCredentialStore {
                    state: Arc::clone(&state),
                };
                let lock_path = lock_path.clone();
                let start = Arc::clone(&start);
                thread::spawn(move || {
                    start.wait();
                    load_or_create(&store, &lock_path).expect("concurrent key initialization")
                })
            })
            .collect::<Vec<_>>();
        start.wait();

        let keys = handles
            .into_iter()
            .map(|handle| handle.join().expect("key initialization thread"))
            .collect::<Vec<_>>();

        assert_eq!(keys[0].expose_bytes(), keys[1].expose_bytes());
        assert_eq!(state.set_count.load(Ordering::SeqCst), 1);
        assert_eq!(state.missing_reads.load(Ordering::SeqCst), 1);
    }
}
