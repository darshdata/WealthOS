import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema(
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
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      default: 'demo-user',
      index: true,
      unique: true,
    },
    // Default cash balance: ₹2,50,000 = 25000000 integer paise
    cashBalancePaise: {
      type: Number,
      required: true,
      default: 25000000,
      min: 0,
    },
    positions: {
      type: [positionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Portfolio = mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;
