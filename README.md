# Ultima - Angular Mobile App

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 20.0.5 and uses Capacitor for mobile deployment.

## 📱 Mobile Features

### Automatic Update System
The app includes a comprehensive automatic update system for mobile applications with the following features:

#### 🔄 Update Policies
- **Server-side policy management** with configurable update rules
- **Offline support** with cached policies
- **Rollout control** with percentage-based deployment
- **Security validation** with SHA256 hash verification
- **Device authentication** with unique device IDs for mobile sessions

#### ⏰ Update Frequency
- **Server consultation**: Once per day (24 hours maximum)
- **Cache verification**: Every app launch
- **Smart caching**: Policies persist offline until new ones are fetched

#### 🎯 Update Types
- **Optional updates**: User can skip or postpone (24h snooze)
- **Forced updates**: Mandatory for specific version ranges
- **Blocked versions**: Immediate update required for security
- **Maintenance mode**: Kill switch for emergency deployments

#### 🔧 Configuration
Update policies are managed server-side at `/app/update-policy` endpoint with the following structure:

```json
{
  "platform": "android",
  "channel": "qa|dev|prod",
  "minVersionCode": 1,
  "latest": {
    "versionCode": 5,
    "versionName": "1.1.0",
    "url": "https://example.com/app.apk",
    "sha256": "hash...",
    "size": 52428800
  },
  "forceFrom": 3,
  "deadline": "2025-10-30T18:00:00Z",
  "message": "Update message",
  "maintenance": false,
  "blockedVersions": [41, 42],
  "rolloutPercent": 100,
  "allowSkipOffline": true,
  "changelogUrl": "https://example.com/changelog",
  "whitelist": ["device-qa-1"]
}
```

#### 🚀 Usage
```typescript
// Check for updates (daily server consultation)
await updateService.checkForUpdates('qa');

// Quick cache-only check
await updateService.checkForUpdatesFromCache('qa'); 

// Force server check
await updateService.checkForUpdates('qa', true);

// Clear cache (force next check to server)
await updateService.clearUpdateCache();
```

## Development server
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## 📱 Mobile Development

### Prerequisites
- Node.js 18+
- Android Studio (for Android development)
- Java JDK 11+

### Build for Mobile
```bash
# Build Angular app
npm run build

# Sync with Capacitor
npx cap sync

# Run on Android
npx cap run android

# Build APK
npx cap build android
```

### Version Management
App versions are configured in:
- **Android**: `android/app/build.gradle` (versionCode & versionName)
- **Angular**: `package.json` (version)

### Environment Configuration
Update server endpoints in:
- `src/environments/environment.ts` (development)
- `src/environments/environment.prod.ts` (production)

Current endpoints:
- **Dev**: `http://127.0.0.1:8000`
- **Prod**: `https://eronuh0qs0.execute-api.mx-central-1.amazonaws.com/dev`

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive/pipe/service/class/module`.

## Build

### Web Build
Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

### Mobile Build
```bash
# Development build
npm run build

# Production build  
ng build --configuration production

# The mobile app reads from: dist/ultima-ng/browser/
```

### 🔧 Project Structure
```
src/
├── app/
│   ├── components/           # Reusable UI components
│   │   └── update-dialog/    # Update notification dialogs
│   ├── utils/
│   │   └── services/
│   │       ├── update.service.ts         # Main update service
│   │       ├── update-manager.service.ts # Update orchestration
│   │       └── general.service.ts        # Device & session management
│   └── guards/
│       └── update.guard.ts   # Route protection for updates
├── environments/             # Environment configurations
android/                      # Capacitor Android project
└── capacitor.config.ts       # Capacitor configuration
```

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).
Before running the tests make sure you are serving the app via `ng serve`.

## 🚀 Deployment

### Mobile App Deployment
1. **Update version** in `android/app/build.gradle`
2. **Build APK**: `npx cap build android`
3. **Upload to server** with proper SHA256 hash
4. **Update server policy** with new version info
5. **Test rollout** using rollout percentage

### Update Server Requirements
The server must implement `/app/update-policy` endpoint that:
- Accepts query parameters: `platform`, `channel`, `versionCode`, `deviceId`
- Returns JSON policy matching the interface `UpdatePolicy`
- Handles CORS for web testing
- Supports timeout handling (10s max)

### Security Considerations
- **HTTPS only** for APK downloads
- **SHA256 verification** for file integrity  
- **Device whitelisting** for QA testing
- **Rollout control** for gradual deployments
- **Emergency kill switch** via maintenance mode

## 📋 Troubleshooting

### Common Issues
- **"Could not find web assets directory"**: Run `npm run build` before `npx cap sync`
- **Update not showing**: Check cache with `updateService.getDebugInfo()`
- **Server errors**: Verify endpoint URL and CORS configuration
- **Build failures**: Ensure Android SDK and Java versions match requirements

### Debug Commands
```typescript
// Check current app version
await updateService.getCurrentAppInfo();

// View cache status
await updateService.getDebugInfo();

// Clear all caches
await updateService.clearUpdateCache();

// Force immediate server check
await updateService.checkForUpdates('qa', true);
```

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

For Capacitor help, visit the [Capacitor Documentation](https://capacitorjs.com/docs).

## 📚 Additional Resources

- **Angular 20**: [Angular Documentation](https://angular.io/docs)
- **Capacitor 7**: [Capacitor Documentation](https://capacitorjs.com/docs)  
- **PrimeNG**: [PrimeNG Components](https://primeng.org/)
- **Tailwind CSS**: [Tailwind Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Built with ❤️ using Angular + Capacitor**