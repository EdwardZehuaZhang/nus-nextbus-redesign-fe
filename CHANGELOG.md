# Changelog

All notable changes to the NUS NextBus Redesign project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-08

### 🎉 Initial Release

#### Added

- **Real-time Bus Tracking**
  - Interactive Google Maps integration
  - Live bus location display
  - Route visualization with polylines

- **Multi-Route Support**
  - Support for 8 NUS shuttle routes: A1, A2, D1, D2, L, E, K
  - Dynamic route colors from backend API
  - Route-specific information and schedules

- **Arrival Information**
  - Real-time bus arrival predictions
  - Multiple next arrival times
  - Bus capacity indicators
  - Service announcements

- **Route Planning & Navigation**
  - Search for destinations across campus
  - Multi-step journey planning
  - Walking directions integration
  - Step-by-step navigation view
  - Estimated journey times

- **Favorites System**
  - Save frequently used routes
  - Persistent local storage with MMKV
  - Quick access from home screen
  - One-tap navigation to saved routes

- **User Interface**
  - Clean, modern design with TailwindCSS/NativeWind
  - Smooth animations with Reanimated and Moti
  - Bottom sheet for route details
  - Expandable route stop listings
  - Responsive layouts for different screen sizes

- **Backend Integration**
  - RESTful API integration with Axios
  - React Query for efficient data fetching and caching
  - Multi-environment support (development, staging, production)
  - Production deployment on Render.com

- **Developer Experience**
  - TypeScript for type safety
  - ESLint and Prettier for code quality
  - Husky git hooks for pre-commit checks
  - Comprehensive documentation
  - Environment-based configuration

#### Technical Stack

- **Framework**: Expo SDK 52
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Query + Zustand
- **Storage**: React Native MMKV
- **Styling**: NativeWind (TailwindCSS)
- **Maps**: Google Maps API
- **Animations**: Reanimated + Moti
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios

#### Infrastructure

- Development backend: `http://localhost:3000`
- Production backend: `https://nus-nextbus-mock-api.onrender.com`
- Multi-environment configuration with `.env` files
- Build profiles for development, staging, and production

---

## [Unreleased]

### Planned Features

- [ ] User authentication and profiles
- [ ] Push notifications for bus arrivals
- [ ] Offline mode with cached data
- [ ] Dark mode support
- [ ] Route history tracking
- [ ] Share routes with friends
- [ ] Accessibility improvements
- [ ] Campus event integration
- [ ] Alternative route suggestions
- [ ] Estimated walking times with elevation data

### Known Issues

- None currently reported

---

## Version History

### Version Numbering

- **Major** (1.x.x): Breaking changes or major new features
- **Minor** (x.1.x): New features, backwards compatible
- **Patch** (x.x.1): Bug fixes and minor improvements

---

## [1.0.0] - 2025-10-08

Initial public release of NUS NextBus Redesign.

**Migration from Template**: This project was built using the Obytes React Native Template and customized for the NUS NextBus use case.

### Breaking Changes from Template

- Complete UI redesign for bus tracking
- New API integration for NUS shuttle service
- Custom route planning logic
- Favorites system implementation
- Google Maps integration

### Repository Updates

- Updated README with project-specific information
- Added CONTRIBUTING.md for community contributions
- Created ENVIRONMENT_SETUP.md for configuration guide
- Added GITHUB_INFO.md for repository metadata
- Updated package.json with project details

---

**Note**: This changelog will be updated with each release. Contributors should add entries under the "Unreleased" section when making changes.
