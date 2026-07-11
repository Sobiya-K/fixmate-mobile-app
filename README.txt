FixMate native PayHere final replacement

Replace these project files:
- app/payhere-checkout.tsx
- app/my-bookings.tsx
- supabase/functions/create-payhere-payment/index.ts

The my-bookings file is included unchanged because its route already points to /payhere-checkout.

After copying:
1. Deploy create-payhere-payment.
2. Start Metro with npm run start:dev.
3. Open the installed FixMate development APK, not Expo Go.
4. Test Pay Online from an accepted booking.
