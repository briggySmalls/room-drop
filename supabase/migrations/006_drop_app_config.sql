-- app_config.notification_email is no longer used — alert emails are
-- sent to each booking owner's auth email address.
DROP TABLE IF EXISTS app_config;
