# StickPM Chat App Installation Guide

Follow these steps to set up the StickPM Chat application on your server:

### Prerequisites

Ensure you have **Node.js** and **npm** installed on your server before proceeding. If not, use the first step to install these packages.

---

### 1. Update System and Install Node.js and npm (Skip if already installed)
Update your package list and install Node.js and npm: (If issues with ? use Node 18.x to cure it)
```bash
sudo apt update
sudo apt install nodejs npm -y
```

Verify the installations:
```bash
node -v
npm -v
```

---

### 2. Install StickPM App Dependencies
Navigate to the application directory and install the required npm packages:
```bash
npm install
```

---

### 3. Generate SSL Certificates
To enable secure HTTPS communication, generate a self-signed SSL certificate with OpenSSL:

#### For Generic Setup:
```bash
sudo apt install openssl -y
openssl req -newkey rsa:2048 -nodes -keyout server.key -x509 -days 365 -out server.crt
```

#### For Domain-Specific Setup (Optional):
```bash
sudo openssl req -newkey rsa:2048 -nodes -keyout server.key -x509 -days 365 -out server.crt -subj "/CN=*.stickpm.com"
```

---

### 4. Run the Application
Launch the app with root permissions to ensure smooth server functionality:
```bash
sudo node app.js
```

---

### 5. Secure Database File (Optional)
To limit access to the `database.json` file, adjust permissions as follows:
```bash
cd modules
sudo chmod 600 database.json
cd ../
sudo chmod 600 server.key
sudo chmod 644 server.crt
sudo chown ubuntu:ubuntu server.key server.crt
sudo chown ubuntu:ubuntu modules/database.json
```

---

### `package.json` Overview

For reference, here’s a snapshot of `package.json`:
```json
{
  "name": "stickpm-chat",
  "version": "1.0.1",
  "description": "A feature-rich chatroom application with real-time communication, streaming, polling, and more.",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "author": "BadNintendo",
  "license": "SEE LICENSE IN LICENSE",
  "dependencies": {
    "audit": "^0.0.6",
    "compression": "^1.7.4",
    ...
  }
}
```

---

### Troubleshooting Extras (Optional)
If issues arise, install additional dependencies:
```bash
sudo npm install -y wrtc domexception@1.0.1
sudo npm install -g node-pre-gyp
```

---

This guide provides a streamlined setup for the StickPM application. For additional details, refer to the project’s documentation or contact the author if you encounter any issues.
