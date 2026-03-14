import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * Authentication account. Every user — whether a donor or a hospital — has
 * exactly one User document. Role-specific data (donor profile, hospital
 * profile) lives in separate collections linked via `userId`.
 */
export interface IUser extends Document {
  email: string;
  /** Stored as a bcrypt hash. Never returned in API responses. */
  password: string;
  /**
   * Determines which resources the account can access.
   * - `DONOR`    — can create/manage a donor profile, take the quiz, view notifications.
   * - `HOSPITAL` — can create/manage a hospital profile, search donors, send notifications, schedule donations.
   */
  userType: 'DONOR' | 'HOSPITAL';
  /** Soft-delete flag. Reserved for future account suspension; currently always true. */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Compares a plain-text candidate password against the stored bcrypt hash.
   * @param candidatePassword - The raw password from the login request body.
   * @returns `true` if the password matches.
   */
  comparePassword(candidatePassword: string): Promise<boolean>;
  /**
   * Generates a signed JWT containing `{ id, email, userType }`.
   * Expiry is controlled by the `JWT_EXPIRE` environment variable (default: 7d).
   * @returns Signed JWT string to be sent in the Authorization header.
   */
  generateAuthToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    userType: {
      type: String,
      enum: ['DONOR', 'HOSPITAL'],
      required: [true, 'User type is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving. Uses salt rounds of 10 (bcrypt default strength).
// Mongoose 9 async pre hooks: no `next` parameter — just return early or resolve.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password as string, 10);
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password as string);
};

userSchema.methods.generateAuthToken = function (this: IUser): string {
  // Cast required because SignOptions['expiresIn'] is a union type that doesn't
  // accept plain strings without the cast — Mongoose env vars are always string.
  const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'] };
  return jwt.sign(
    { id: this._id, email: this.email, userType: this.userType },
    process.env.JWT_SECRET!,
    options
  );
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
