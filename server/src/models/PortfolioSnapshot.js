import mongoose from 'mongoose';

const positionSnapshotSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sector: {
      type: String,
      required: true,
      trim: true,
      default: 'Diversified',
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    avgBuyPricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    marketPricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    marketValuePaise: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const portfolioSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      default: 'demo-user',
      index: true,
    },
    // Valuation date string formatted as YYYY-MM-DD in Asia/Kolkata timezone
    valuationDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    // Exact timestamp when the valuation snapshot was recorded
    valuationTimestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    // Cash balance in integer paise (e.g. ₹2,50,000 = 25000000 paise)
    cashBalancePaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer cash balance in paise',
      },
    },
    // Mark-to-market holdings value in integer paise
    holdingsMarketValuePaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer holdings market value in paise',
      },
    },
    // Total net worth = cashBalancePaise + holdingsMarketValuePaise
    totalPortfolioValuePaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer total portfolio value in paise',
      },
    },
    // Source of pricing data (SERVER_SIMULATED for paper trading)
    priceSource: {
      type: String,
      required: true,
      default: 'SERVER_SIMULATED',
      enum: ['SERVER_SIMULATED', 'HISTORICAL_SEED', 'EXCHANGE_FEED'],
    },
    // Explicit disclosure flag: true indicates simulated pricing
    isSimulated: {
      type: Boolean,
      required: true,
      default: true,
    },
    // Positions breakdown snapshot at valuation time
    positionsSnapshot: {
      type: [positionSnapshotSchema],
      default: [],
    },
    // Schema versioning & operational metadata
    metadata: {
      schemaVersion: {
        type: Number,
        default: 1,
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      positionsCount: {
        type: Number,
        default: 0,
      },
      notes: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring one snapshot per user per valuation date (Idempotency)
portfolioSnapshotSchema.index({ userId: 1, valuationDate: 1 }, { unique: true });

// Compound index for chronological range queries
portfolioSnapshotSchema.index({ userId: 1, valuationTimestamp: 1 });

export const PortfolioSnapshot =
  mongoose.models.PortfolioSnapshot ||
  mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);

export default PortfolioSnapshot;
