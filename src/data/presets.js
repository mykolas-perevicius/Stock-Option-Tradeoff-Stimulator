/**
 * Pre-built scenario presets for educational purposes
 */

export const presets = [
  {
    id: 'meme-stock',
    name: 'Meme Stock',
    description: 'High IV volatile stock (like GME, AMC)',
    params: {
      currentPrice: 25,
      strikePrice: 30,
      daysToExpiry: 14,
      impliedVol: 120,
      riskFreeRate: 5,
      investmentAmount: 5000,
      isCall: true,
    },
    notes: 'Extremely high IV means expensive premiums but large potential swings. High risk of total loss if stock doesn\'t move significantly.',
  },
  {
    id: 'blue-chip',
    name: 'Blue Chip',
    description: 'Low IV stable stock (like JNJ, PG)',
    params: {
      currentPrice: 150,
      strikePrice: 155,
      daysToExpiry: 45,
      impliedVol: 18,
      riskFreeRate: 5,
      investmentAmount: 10000,
      isCall: true,
    },
    notes: 'Low IV means cheaper premiums but smaller expected moves. More conservative play with better odds but lower leverage.',
  },
  {
    id: 'earnings-play',
    name: 'Earnings Play',
    description: 'Pre-earnings high IV, short DTE',
    params: {
      currentPrice: 180,
      strikePrice: 190,
      daysToExpiry: 7,
      impliedVol: 65,
      riskFreeRate: 5,
      investmentAmount: 5000,
      isCall: true,
    },
    notes: 'IV is elevated before earnings. If stock moves enough, options can profit. But IV crush after earnings can hurt option value even if direction is correct.',
  },
  {
    id: 'leaps',
    name: 'LEAPS',
    description: 'Long-dated options (1+ year)',
    params: {
      currentPrice: 175,
      strikePrice: 200,
      daysToExpiry: 365,
      impliedVol: 28,
      riskFreeRate: 5,
      investmentAmount: 15000,
      isCall: true,
    },
    notes: 'Long-dated options have high delta and less time decay per day. Acts more like leveraged stock. Higher absolute premium but more time for thesis to play out.',
  },
  {
    id: 'weekly-scalp',
    name: 'Weekly Options',
    description: 'Very short-dated, high gamma',
    params: {
      currentPrice: 450,
      strikePrice: 455,
      daysToExpiry: 5,
      impliedVol: 22,
      riskFreeRate: 5,
      investmentAmount: 3000,
      isCall: true,
    },
    notes: 'Weeklies have extreme time decay (theta) and high gamma. Small moves can mean big percentage gains or losses. Very risky but cheap in absolute terms.',
  },
  {
    id: 'deep-itm',
    name: 'Deep ITM Call',
    description: 'High delta, stock replacement',
    params: {
      currentPrice: 100,
      strikePrice: 80,
      daysToExpiry: 60,
      impliedVol: 30,
      riskFreeRate: 5,
      investmentAmount: 10000,
      isCall: true,
    },
    notes: 'Deep ITM calls have delta close to 1.0 and behave almost like stock. Less leverage but less risk of total loss. Good for capital-efficient stock exposure.',
  },
  {
    id: 'otm-lottery',
    name: 'OTM Lottery Ticket',
    description: 'Cheap OTM with low probability',
    params: {
      currentPrice: 100,
      strikePrice: 120,
      daysToExpiry: 30,
      impliedVol: 35,
      riskFreeRate: 5,
      investmentAmount: 2000,
      isCall: true,
    },
    notes: 'Far OTM options are cheap but have low probability of profit. Like a lottery ticket - usually lose everything but occasionally hit big.',
  },
  {
    id: 'put-protection',
    name: 'Protective Put',
    description: 'Bearish hedge / insurance',
    params: {
      currentPrice: 150,
      strikePrice: 140,
      daysToExpiry: 30,
      impliedVol: 25,
      riskFreeRate: 5,
      investmentAmount: 10000,
      isCall: false,
    },
    notes: 'Buying puts as insurance against a stock drop. Like paying for portfolio insurance. Profitable if stock falls below strike minus premium.',
  },
];

/**
 * Get a preset by ID
 */
export function getPresetById(id) {
  return presets.find((p) => p.id === id);
}

/**
 * Get preset categories
 */
export function getPresetCategories() {
  return [
    { category: 'Volatility', presets: ['meme-stock', 'blue-chip'] },
    { category: 'Time Horizon', presets: ['weekly-scalp', 'earnings-play', 'leaps'] },
    { category: 'Moneyness', presets: ['deep-itm', 'otm-lottery'] },
    { category: 'Direction', presets: ['put-protection'] },
  ];
}
