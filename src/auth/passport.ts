import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "../config/env.js";
import { Business } from "../models/Business.js";
import { User } from "../models/User.js";

export function configurePassport(): void {
  const { clientId, clientSecret, callbackUrl } = env.oauth.google;
  if (!clientId || !clientSecret) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: clientId,
        clientSecret,
        callbackURL: callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            done(new Error("Google account has no email"));
            return;
          }

          const business = await Business.findOne();
          if (!business) {
            done(new Error("Register business before using Google sign-in"));
            return;
          }

          let user = await User.findOne({ businessId: business._id, email });
          if (!user) {
            user = await User.create({
              businessId: business._id,
              email,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
              googleId: profile.id,
            });
          } else if (!user.googleId) {
            user.googleId = profile.id;
            user.avatarUrl = user.avatarUrl ?? profile.photos?.[0]?.value;
            await user.save();
          }

          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      },
    ),
  );
}
