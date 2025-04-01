export const getNowMinusMinutes = (minutesToSubstract: number): Date => {
  const dateNow = new Date();
  return new Date(dateNow.getTime() - minutesToSubstract * 60 * 1000);
};

export const checkerEveryElementExist = (
  arr: string[],
  target: string[]
): Boolean => {
  return target.every((v) => arr.includes(v));
};
