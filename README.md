<h1 align="center">
  🚌 NUS NextBus Redesign
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Web-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/Expo-SDK%2052-000020?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/React%20Native-0.76-61DAFB?logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript" />
</p>

<p align="center">
  Modern mobile app for NUS Internal Shuttle Bus Service with real-time tracking, route planning, and interactive maps. Built with Expo and TypeScript.
</p>
---

## 📱 About

NUS NextBus Redesign is a complete overhaul of the NUS Internal Shuttle Bus Service mobile app. This project aims to provide students, staff, and visitors with a modern, intuitive, and feature-rich experience for tracking and planning their bus journeys around the NUS campus.

### Key Features

- 🗺️ **Interactive Map**: Real-time bus tracking with Google Maps integration
- 🚏 **Bus Stop Information**: Comprehensive details about all bus stops and routes
- ⏱️ **Real-time Arrivals**: Live bus arrival times for all routes (A1, A2, D1, D2, BTC, L, E, K)
- 🎯 **Route Navigation**: Step-by-step journey planning with walking directions
- ⭐ **Favorites System**: Save frequently used routes for quick access
- 🎨 **Route Colors**: Dynamic color-coded routes matching official NUS bus colors
- 🔍 **Smart Search**: Find destinations and plan routes efficiently
- 🌐 **Multi-environment Support**: Development and production backend configurations

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- pnpm (recommended) or npm
- Expo CLI
- iOS Simulator (Mac only) or Android Emulator

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/EdwardZehuaZhang/nus-nextbus-redesign-fe.git
   cd nus-nextbus-redesign-fe
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start the development server**

   ```bash
   # Development (localhost backend)
   pnpm start

   # Production (Render.com backend)
   pnpm run start:production
   ```

4. **Run on your device**
   - Scan QR code with Expo Go app
   - Or press `i` for iOS simulator
   - Or press `a` for Android emulator

---

## 🏗️ Project Structure

```
nus-nextbus-redesign-fe/
├── src/
│   ├── api/              # API integration & data fetching
│   │   ├── bus/          # Bus-related API endpoints
│   │   ├── google-maps/  # Google Maps API integration
│   │   └── common/       # Shared API utilities
│   ├── app/              # Expo Router pages
│   │   ├── (app)/        # Authenticated app screens
│   │   │   ├── transit.tsx      # Main bus tracking page
│   │   │   ├── navigation.tsx   # Route navigation page
│   │   │   └── search.tsx       # Destination search
│   │   ├── login.tsx     # Login screen
│   │   └── onboarding.tsx
│   ├── components/       # Reusable UI components
│   │   ├── bus-indicator.tsx
│   │   ├── interactive-map.tsx
│   │   └── ui/           # Base UI components
│   ├── lib/              # Utilities & helpers
│   │   ├── auth/         # Authentication logic
│   │   ├── storage/      # MMKV storage (favorites)
│   │   └── hooks/        # Custom React hooks
│   └── translations/     # i18n language files
├── .env.development      # Local backend config
├── .env.production       # Production backend config
└── app.config.ts         # Expo configuration
```

---

## 🔧 Configuration

### Environment Variables

The app supports multiple environments with different backend configurations:

**Development** (Local Backend)

**Development** (Actual NUS NextBus API)

```bash
API_URL=https://nnextbus.nus.edu.sg
```

**Production** (Actual NUS NextBus API)

```bash
API_URL=https://nnextbus.nus.edu.sg
```

**Note**: The app now uses the official NUS NextBus API with HTTP Basic Authentication. Credentials are configured in the API client.

Switch environments using:

```bash
pnpm start                    # Development
pnpm run start:production     # Production
pnpm run start:staging        # Staging
```

For detailed environment setup, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)

### Google Maps API

Add your Google Maps API key to environment files:

```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

---

## 🚌 Backend API

The app connects to the official NUS NextBus API which provides:

- Bus stop locations and information
- Real-time shuttle service data
- Route descriptions and colors
- Active bus tracking (live GPS locations)
- Announcements and ticker tapes

**API Base URL**: https://nnextbus.nus.edu.sg

**Authentication**: HTTP Basic Auth (configured in client)

### Available Endpoints

```
GET /BusStops              - All bus stops
GET /ShuttleService        - Bus arrival times
GET /ServiceDescription    - Route information with colors
GET /ActiveBus             - Real-time bus GPS locations
GET /PickupPoint           - Pickup points for routes
GET /CheckPoint            - Route checkpoints
GET /Announcements         - Service announcements
GET /BusLocation           - Specific bus location by plate
GET /RouteMinMaxTime       - Route operating hours
```

---

## 🛠️ Tech Stack

### Core Technologies

- **[Expo SDK 52](https://docs.expo.dev/)** - React Native framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Expo Router](https://docs.expo.dev/router/introduction/)** - File-based navigation
- **[NativeWind](https://www.nativewind.dev/)** - TailwindCSS for React Native

### Data & State Management

- **[React Query](https://tanstack.com/query/latest)** - Server state & data fetching
- **[Zustand](https://github.com/pmndrs/zustand)** - Client state management
- **[React Native MMKV](https://github.com/mrousavy/react-native-mmkv)** - Fast local storage
- **[Axios](https://axios-http.com/)** - HTTP client

### UI & Animations

- **[React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)** - Smooth animations
- **[Moti](https://moti.fyi/)** - Declarative animations
- **[React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)** - Touch gestures
- **[Bottom Sheet](https://github.com/gorhom/react-native-bottom-sheet)** - Native bottom sheets

### Maps & Location

- **[Google Maps API](https://developers.google.com/maps)** - Interactive maps
- **[Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)** - User location services
- **[@mapbox/polyline](https://github.com/mapbox/polyline)** - Route polyline decoding

### Forms & Validation

- **[React Hook Form](https://react-hook-form.com/)** - Performant forms
- **[Zod](https://zod.dev/)** - Schema validation

### Development Tools

- **[ESLint](https://eslint.org/)** - Code linting
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Husky](https://typicode.github.io/husky/)** - Git hooks
- **[Jest](https://jestjs.io/)** - Unit testing
- **[React Testing Library](https://testing-library.com/react)** - Component testing

---

## 📸 Screenshots

> _Coming soon - Add screenshots of the app here_

---

## 🗺️ Roadmap

### ✅ Completed

- [x] Real-time bus tracking with interactive map
- [x] Multi-route support (A1, A2, D1, D2, BTC, L, E, K)
- [x] Dynamic route colors from API
- [x] Favorites system with persistent storage
- [x] Search and route planning
- [x] Production backend deployment
- [x] Multi-environment configuration

### 🚧 In Progress

- [ ] User authentication and profiles
- [ ] Push notifications for bus arrivals
- [ ] Offline mode support
- [ ] Bus crowding indicators

### 📋 Planned

- [ ] Accessibility improvements
- [ ] Dark mode support
- [ ] Route history
- [ ] Share routes with friends
- [ ] Campus event integration
- [ ] Estimated walking times
- [ ] Alternative route suggestions

---

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute to the NUS NextBus Redesign project:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **NUS Internal Shuttle Bus Service** - For providing the campus transportation service
- **[Obytes](https://www.obytes.com/)** - For the excellent React Native starter template
- **NUS Community** - For feedback and testing

---

## 📞 Contact

**Edward Zehua Zhang**

- GitHub: [@EdwardZehuaZhang](https://github.com/EdwardZehuaZhang)
- Project Link: [https://github.com/EdwardZehuaZhang/nus-nextbus-redesign-fe](https://github.com/EdwardZehuaZhang/nus-nextbus-redesign-fe)

---

## 📚 Related Projects

- [NUS NextBus Mock API](https://github.com/EdwardZehuaZhang/nus-nextbus-mock-api) - Backend API server

---

<p align="center">Made with ❤️ for the NUS Community</p>
