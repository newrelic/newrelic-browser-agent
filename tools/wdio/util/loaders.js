module.exports = [
  { name: 'rum', features: [] }, // light loader
  { name: 'xhr', features: ['err', 'xhr'] },
  { name: 'stn', features: ['err', 'xhr', 'stn'] },
  { name: 'full', features: ['err', 'xhr', 'stn', 'ins'] }, // pro loader
  {
    name: 'dev',
    features: ['err', 'xhr', 'stn', 'ins', 'spa'],
    payload: 'dev'
  },
  {
    name: 'spa',
    features: ['err', 'xhr', 'stn', 'ins', 'spa'],
    payload: 'spa'
  }
]
