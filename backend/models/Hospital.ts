import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IHospital extends Document {
  userId: mongoose.Types.ObjectId;
  hospitalName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  neighborhood: string;
  operatingHours: string;
  licenseNumber?: string;
  verificationStatus: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<IHospital>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    hospitalName: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    neighborhood: {
      type: String,
      required: [true, 'Neighborhood is required'],
    },
    operatingHours: {
      type: String,
      required: [true, 'Operating hours are required'],
    },
    licenseNumber: {
      type: String,
    },
    verificationStatus: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

hospitalSchema.index({ hospitalName: 1 });
hospitalSchema.index({ neighborhood: 1 });

const Hospital: Model<IHospital> = mongoose.model<IHospital>('Hospital', hospitalSchema);
export default Hospital;
