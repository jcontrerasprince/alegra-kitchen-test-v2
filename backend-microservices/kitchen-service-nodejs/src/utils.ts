export const getNowMinusMinutes = (minutesToSubstract: number): Date => {
    const dateNow = new Date();
    return new Date(dateNow.getTime() - minutesToSubstract * 60 * 1000);
  };
  