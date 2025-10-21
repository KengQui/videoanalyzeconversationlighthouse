# Agent Eval Framework Explorer

## Overview

The Agent Eval Framework Explorer is a web application designed to help users explore and analyze agent evaluation frameworks through an interactive interface. The application displays a hardcoded agent evaluation framework (197 criteria across 4 milestones) in an interactive data table and provides an AI-powered chatbot assistant to answer questions about the framework content.

The application uses a dual-panel interface that balances data exploration with AI assistance, providing a clean, technical UI optimized for information-dense content.

## Recent Changes

**October 21, 2025**: Transitioned from file upload system to hardcoded framework data
- Removed file upload UI and functionality  
- Framework data now hardcoded in `server/framework-data.ts` (197 evaluation criteria)
- Removed upload, export, and data management API endpoints
- Simplified Header component (removed export button)
- Framework data immediately available on page load

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server.

**UI Component Library**: shadcn/ui components built on top of Radix UI primitives, providing a comprehensive set of accessible, customizable components.

**Styling**: Tailwind CSS with custom design tokens following a dual-theme (light/dark) approach. The design philosophy emphasizes technical clarity, data-first presentation, and split-focus efficiency with a dual-panel layout.

**State Management**: TanStack Query (React Query) for server state management, with query caching and automatic refetching capabilities.

**Routing**: Wouter for lightweight client-side routing.

**Key Design Patterns**:
- Component-based architecture with clear separation of concerns
- Custom hooks for reusable logic (toast notifications, mobile detection, theme management)
- Type-safe API communication using shared TypeScript schemas
- Design system following Material Design principles with references to Linear, Notion, and ChatGPT UI patterns

### Backend Architecture

**Runtime**: Node.js with Express.js web framework.

**Language**: TypeScript with ES Modules.

**API Design**: RESTful endpoints for chat interactions and data retrieval.

**Storage Strategy**: In-memory storage implementation (`MemStorage` class) initialized with hardcoded framework data and chat history. Framework data persists across server restarts by being hardcoded in `server/framework-data.ts`.

**Development Setup**: Custom Vite middleware integration for hot module replacement and seamless development experience.

**Key Architectural Decisions**:
- Separation of routes, storage, and AI integration into distinct modules
- Middleware-based request logging and error handling
- Type-safe shared schemas between frontend and backend using Zod validation

### Data Storage Solutions

**Current Implementation**: In-memory storage using JavaScript Maps and objects. Framework data is hardcoded and initialized on server startup from `server/framework-data.ts` (197 evaluation criteria). Chat messages are stored in RAM during application runtime.

**Database Schema Design**: PostgreSQL schema defined using Drizzle ORM with two main tables:
- `framework_content`: Stores uploaded spreadsheet rows as flexible JSON
- `chat_messages`: Stores conversation history with role, content, and timestamp

**Migration Strategy**: Drizzle Kit configured for schema migrations with PostgreSQL dialect.

**Rationale**: The in-memory approach allows for rapid prototyping and simple deployment. The Drizzle schema provides a clear path for future persistence when needed. The flexible JSON storage for framework content accommodates varying spreadsheet structures without rigid schema constraints.

### External Dependencies

**AI Integration**: Google Gemini API (via `@google/genai` package) using the gemini-2.5-flash model for chat functionality. The chatbot provides context-aware responses by incorporating uploaded framework data into prompts.

**Database**: Configured for PostgreSQL via Neon serverless (`@neondatabase/serverless`), though currently using in-memory storage. Connection string expected via `DATABASE_URL` environment variable.

**UI Component Dependencies**:
- Radix UI primitives for accessible, unstyled components
- Lucide React for consistent iconography
- Various utility libraries (clsx, class-variance-authority) for styling composition

**Development Tools**:
- Replit-specific plugins for development environment integration
- ESBuild for production server bundling
- TypeScript compiler for type checking

**Environment Configuration**:
- `GEMINI_API_KEY`: Required for AI chat functionality
- `DATABASE_URL`: Required for database connection (when not using in-memory storage)
- `NODE_ENV`: Controls development vs production behavior