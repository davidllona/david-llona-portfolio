export const easeIn3 = (t) => t * t * t;
export const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
export const easeIO3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const clamp01 = (t) => Math.max(0, Math.min(1, t));
export const lerpV = (a, b, t) => a + (b - a) * t;

export const phase = (sp, s, e) => clamp01((sp - s) / (e - s));
