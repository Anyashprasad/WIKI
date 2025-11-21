# WIKI Security Scanner

A powerful, modern web vulnerability scanner designed for security professionals and developers. WIKI Security Scanner performs comprehensive security assessments, identifying vulnerabilities like SQL Injection, XSS, CSRF, and more.

![WIKI Security Scanner](client/public/logo.svg)


## 🎥 Demo

### Vulnerability Scanning
![Scan Demo](assets/scan-demo.webp)

### About Page & Animations
![About Page Demo](assets/about-demo.webp)

## 🚀 Features

-   **Comprehensive Scanning**: Detects a wide range of vulnerabilities including:
    -   SQL Injection (SQLi)
    -   Cross-Site Scripting (XSS) - Reflected & DOM-based
    -   Cross-Site Request Forgery (CSRF)
    -   Information Disclosure
    -   Security Misconfigurations
-   **Real-time Progress**: Live updates via WebSockets showing pages scanned, forms found, and vulnerabilities detected.
-   **Interactive Reports**: Detailed vulnerability reports with severity levels, descriptions, and remediation advice.
-   **Export Options**: Export scan results to JSON, Excel, and PDF formats.
-   **Modern UI**: A sleek, dark-themed interface built with React and Tailwind CSS.
-   **Worker-based Architecture**: Efficient scanning using Node.js worker threads for parallel processing.

## 🛠️ Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Wouter (Routing), TanStack Query.
-   **Backend**: Node.js, Express, WebSocket (ws/socket.io), Worker Threads.
-   **Database**: PostgreSQL (via Drizzle ORM).
-   **Scanning Engine**: Custom crawler and vulnerability detection logic (Cheerio, Axios).

## 📋 Prerequisites

Before running the project, ensure you have the following installed:

-   **Node.js** (v18 or higher)
-   **npm** (v9 or higher)
-   **PostgreSQL** database

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/wiki-security-scanner.git
    cd wiki-security-scanner
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory and add your database credentials:
    ```env
    DATABASE_URL=postgresql://username:password@localhost:5432/secure_scan
    ```

4.  **Initialize Database**
    Push the schema to your database:
    ```bash
    npm run db:push
    ```

5.  **Start the Development Server**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5000`.

## 📂 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages (Home, Results, About)
│   │   └── lib/            # Utilities and API clients
│   └── index.html          # Entry HTML file
├── server/                 # Backend Node.js application
│   ├── routes.ts           # API routes definition
│   ├── scan-worker.cjs     # Worker thread for vulnerability scanning
│   ├── vulnerability-scanner.ts # Main scanner logic
│   └── websocket-server.ts # Real-time communication
├── shared/                 # Shared types and schemas (Drizzle/Zod)
└── package.json            # Project dependencies and scripts
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Developed by Anyash Prasad**
