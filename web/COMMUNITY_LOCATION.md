# Citizen location and nearby-help service

## What is stored

After a citizen creates an account and explicitly agrees to location sharing, the API stores a **rounded** GeoJSON point (about 100 m precision), their sharing preferences, accuracy, and consent/update timestamps in `citizenLocations`.

It does not store the browser's exact coordinate, does not expose another citizen's phone/email/address, and deletes the location record automatically after 30 days. A citizen can revoke consent through `DELETE /api/citizens/location-consent`, which also deletes outstanding connection requests.

## Matching flow

1. The citizen signs up in the web app.
2. The consent screen explains the purpose and separately enables nearby services and opt-in community requests.
3. The browser asks for location only after the citizen presses the consent action.
4. The client posts the rounded location over HTTPS to the API with a short-lived authenticated token.
5. MongoDB `2dsphere` indexes find help services within 5 km and community members who separately opted in within 3 km.
6. The client receives public service details plus a display name and broad distance band for community members. It never receives another member's exact point or contact details.
7. If the selected local vulnerability score becomes High/Critical while the app is open, RootLedger refreshes those matches automatically.

## Configure locally

```bash
cd web
cp .env.example .env
# Put the Atlas URI and a generated 32+ character JWT secret in .env.
npm run dev:api
```

In a second terminal, start the interface with `npm run dev`. The client defaults to `http://localhost:8787`; set `VITE_COMMUNITY_API_BASE_URL` if deployed elsewhere.

Before using real citizens, add verified records to the `helpServices` MongoDB collection with `name`, `category`, `relevance`, `phone`, `active`, and `geo: { type: 'Point', coordinates: [longitude, latitude] }`.

## Production requirements

- Serve the app and API over HTTPS, set `WEB_ORIGIN` to the deployed frontend URL, and use a TLS-enabled MongoDB Atlas connection.
- Keep `.env` out of source control; create a restricted database user with only the required database permissions.
- Replace the 15-minute demo access token flow with HttpOnly secure refresh cookies and email/phone verification before public release.
- Add a trusted notification provider and verified emergency-service data before attempting background alerts. The current implementation refreshes help while the signed-in web app is open; it does not send SMS/push messages.
- Publish a retention/deletion policy and obtain legal/privacy review for Nepal and every deployment region.
