# Reportanalyser

A report analysis application with Coolify deployment configuration.

## Project Structure

- `docker-compose.yml` - Development configuration
- `docker-compose.production.yml` - Production configuration for Coolify
- `Dockerfile` - Container definition for the application
- `index.js` - Simple Express.js server
- `package.json` - Node.js dependencies

## Local Development

To run the project locally:

```bash
docker compose up
```

The application will be available at http://localhost:3000

## Deployment with Coolify

This project is configured for continuous deployment with Coolify.

### Prerequisites

1. A server with Coolify installed
2. GitHub repository for this project

### Setup in Coolify

1. Log in to your Coolify dashboard
2. Create a new project
3. Select "Git Based Deployment"
4. Connect your GitHub repository
5. Select "Docker Compose" as the Build Pack
6. Set the Docker Compose file location to `/docker-compose.production.yml`
7. Set the following environment variables:
   - `DATABASE_URL` - Your database connection string
   - `SECRET_KEY` - A secure random string
   - `HOST_DOMAIN` - Your domain name (e.g., `app.yourdomain.com`)
8. Deploy your application

### Automatic Deployments

Coolify will automatically redeploy your application whenever you push changes to your repository. You can also manually trigger deployments from the Coolify dashboard.

## Environment Variables

The following environment variables should be set in Coolify:

- `DATABASE_URL` - Database connection string
- `SECRET_KEY` - Secret key for encryption/sessions
- `HOST_DOMAIN` - Domain for the application
- `PORT` - (Optional) Port for the application, defaults to 3000

## Notes

- Don't manually define ports in `docker-compose.production.yml` as Coolify handles this automatically
- Use labels for Traefik routing and SSL configuration 