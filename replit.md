# Overview

This is a vulnerability scanning and security analysis web application built with React and Express. The system allows users to submit URLs for security scanning, provides real-time vulnerability detection, and includes an AI-powered chat feature for security consultations. The application performs automated security assessments including SQL injection detection, XSS vulnerability scanning, CSRF analysis, API endpoint testing, and load testing.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom design tokens and dark mode support
- **State Management**: TanStack Query for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Chart.js with react-chartjs-2 for vulnerability data visualization

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured route handling
- **Development**: Hot module replacement with Vite integration for development mode
- **Error Handling**: Centralized error middleware with structured error responses

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Management**: Drizzle Kit for migrations and schema changes
- **Development Storage**: In-memory storage implementation for development/testing
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

## Core Features
- **Vulnerability Scanning**: Mock vulnerability detection for SQL injection, XSS, CSRF, API issues, and load testing
- **Real-time Updates**: Polling-based status updates during scan execution
- **Data Visualization**: Interactive charts showing vulnerability distribution by category and severity
- **Export Functionality**: JSON export capabilities for scan results
- **AI Chat Integration**: Ollama integration for security-related AI assistance

## Authentication and Authorization
- Currently implemented with basic session management
- Session storage backed by PostgreSQL for persistence
- No complex user authentication system implemented yet

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database hosting
- **Connection**: Uses `@neondatabase/serverless` driver for database connectivity

## AI Services
- **Ollama**: Local LLM integration for AI-powered security chat assistance
- **Default Model**: Llama3 for generating security-related responses
- **Fallback**: Graceful degradation when Ollama service is unavailable

## UI Component Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible React components
- **Lucide React**: Icon library for consistent iconography
- **Chart.js**: Data visualization library for vulnerability analytics

## Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire application
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing with autoprefixer

## Styling and Theming
- **shadcn/ui**: Design system built on Radix UI and Tailwind CSS
- **CSS Variables**: Dynamic theming support with light/dark mode
- **Custom Fonts**: Google Fonts integration (Inter, Fira Code, etc.)

## Replit Integration
- **Replit-specific plugins**: Runtime error modal and cartographer for development
- **Environment Detection**: Special handling for Replit environment variables