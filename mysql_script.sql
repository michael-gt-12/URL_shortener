-- Create database
CREATE DATABASE IF NOT EXISTS url_shortener
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE url_shortener;

-- (Recommended) Create a dedicated user for this app
CREATE USER IF NOT EXISTS 'url_user'@'localhost' IDENTIFIED BY 'YourStrongPasswordHere';
GRANT ALL PRIVILEGES ON url_shortener.* TO 'url_user'@'localhost';
FLUSH PRIVILEGES;

-- Create the table
CREATE TABLE IF NOT EXISTS urls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  short_code VARCHAR(10) NOT NULL UNIQUE,
  original_url VARCHAR(2048) NOT NULL,
  hits INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;



