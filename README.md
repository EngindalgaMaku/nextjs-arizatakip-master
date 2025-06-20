# Admin Dashboard

A modern admin dashboard built with Next.js, Tailwind CSS, and Supabase.

## Features

- User authentication and role-based access control
- Dashboard overview with key metrics
- User management
- Product management
- Analytics and reports
- Settings configuration

## Technologies Used

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Authentication & Database)
- React Query (for data fetching)
- Zustand (for state management)

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Supabase account (for authentication and database)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd admin-dashboard
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Configure environment variables:

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Supabase Setup

1. Create a new Supabase project
2. Set up the following tables:
   - users (extends the built-in auth.users table)
   - products
   - orders
   - settings
3. Configure authentication providers in Supabase
4. Set up Row Level Security (RLS) policies for each table

## Project Structure

- `/src/app`: Main application routes and pages
- `/src/app/dashboard`: Admin dashboard pages
- `/src/components`: Reusable React components
- `/src/lib`: Utility functions and shared code
- `/src/lib/supabase.ts`: Supabase client and API functions

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
