use keyring::Entry;
use rand::RngCore;
use secrecy::{ExposeSecret, SecretBox};
use thiserror::Error;

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
    fn get(&self) -> Result<Option<String>, KeyError>;
    fn set(&self, value: &str) -> Result<(), KeyError>;
}

pub struct WindowsCredentialStore;

impl CredentialStore for WindowsCredentialStore {
    fn get(&self) -> Result<Option<String>, KeyError> {
        let entry = Entry::new(SERVICE, ACCOUNT).map_err(|_| KeyError::CredentialStore)?;
        match entry.get_password() {
            Ok(value) => Ok(Some(value)),
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

pub fn load_or_create(store: &impl CredentialStore) -> Result<DatabaseKey, KeyError> {
    if let Some(encoded_key) = store.get()? {
        return decode_key(&encoded_key);
    }

    let mut bytes = [0_u8; KEY_BYTES];
    rand::rngs::OsRng
        .try_fill_bytes(&mut bytes)
        .map_err(|_| KeyError::RandomSource)?;
    store.set(&hex::encode(bytes))?;
    Ok(DatabaseKey(SecretBox::new(Box::new(bytes))))
}

fn decode_key(encoded_key: &str) -> Result<DatabaseKey, KeyError> {
    let decoded = hex::decode(encoded_key).map_err(|_| KeyError::InvalidStoredKey)?;
    let bytes: [u8; KEY_BYTES] = decoded.try_into().map_err(|_| KeyError::InvalidStoredKey)?;
    Ok(DatabaseKey(SecretBox::new(Box::new(bytes))))
}

#[derive(Debug, Error)]
pub enum KeyError {
    #[error("credential store is unavailable")]
    CredentialStore,
    #[error("stored database key is invalid")]
    InvalidStoredKey,
    #[error("operating-system random source is unavailable")]
    RandomSource,
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::{load_or_create, CredentialStore, KeyError};

    #[derive(Default)]
    struct MemoryCredentialStore(Mutex<Option<String>>);

    impl CredentialStore for MemoryCredentialStore {
        fn get(&self) -> Result<Option<String>, KeyError> {
            Ok(self.0.lock().expect("memory credential lock").clone())
        }

        fn set(&self, value: &str) -> Result<(), KeyError> {
            *self.0.lock().expect("memory credential lock") = Some(value.to_owned());
            Ok(())
        }
    }

    #[test]
    fn creates_and_reuses_one_random_32_byte_key_through_the_store_boundary() {
        let store = MemoryCredentialStore::default();

        let created = load_or_create(&store).expect("key should be created");
        let loaded = load_or_create(&store).expect("key should be loaded");

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
}
