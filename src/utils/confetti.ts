import confetti from 'canvas-confetti';

export const shootConfetti = () => {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00f0ff', '#5865f2', '#23a55a', '#f0b232']
    });
  } catch (e) {
    console.warn('Confetti error:', e);
  }
};
