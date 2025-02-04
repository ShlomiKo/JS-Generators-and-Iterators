#! /usr/bin/env node

const { default: Axios } = require("axios");
const { read } = require("fs");

const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "enter command >",
});

readline.prompt();
readline.on("line", async (line) => {
  switch (line.trim()) {
    case "list vegan foods": {
      Axios.get(`http://localhost:3001/food`).then(({ data }) => {
        let idx = 0;
        const veganOnly = data.filter((food) => {
          return food.dietary_preferences.includes("vegan");
        });
        const veganIterable = {
          [Symbol.iterator]() {
            return {
              [Symbol.iterator]() {
                return this;
              },
              next() {
                const current = veganOnly[idx];
                idx++;
                if (current) {
                  return { value: current, done: false };
                } else {
                  return { value: current, done: true };
                }
              },
            };
          },
        };
        for (const val of veganIterable) {
          console.log(val.name);
        }
        readline.prompt();
      });
      break;
    }
    case "list vegan for": {
      const { data } = await Axios.get(`http://localhost:3001/food`);
      const veganOnly = data.filter((food) => {
        return food.dietary_preferences.includes("vegan");
      });
      for (const item of veganOnly) {
        console.log(item.name);
      }
      readline.prompt();
      break;
    }
    case "new vegan list": {
      const { data } = await Axios.get(`http://localhost:3001/food`);

      function* listVeganFoods() {
        try {
          let idx = 0;
          const veganOnly = data.filter((food) =>
            food.dietary_preferences.includes("vegan")
          );
          while (veganOnly[idx]) {
            yield veganOnly[idx];
            idx++;
          }
        } catch (error) {
          console.log("Something went wrong while listing vegan items", {
            error,
          });
        }
      }

      for (let val of listVeganFoods()) {
        console.log(val.name);
      }
      readline.prompt();
      break;
    }
    case "log": {
      readline.question(`What would you like to log today? `, async (item) => {
        const { data } = await Axios.get(`http://localhost:3001/food`);
        const it = data[Symbol.iterator]();
        let position = it.next();
        while (!position.done) {
          const food = position.value.name;
          if (food === item) {
            console.log(`${item} has ${position.value.calories} calories`);
          }
          position = it.next();
        }
        readline.prompt();
      });
      break;
    }
    case "logFor": {
      readline.question(`What would you like to log today? `, async (item) => {
        const { data } = await Axios.get(`http://localhost:3001/food`);
        for (const food of data) {
          console.log(food);
          if (food.name === item) {
            console.log(`${item} has ${food.calories} calories`);
          }
        }
        readline.prompt();
      });
      break;
    }
    case "logNew": {
      const { data } = await Axios.get(`http://localhost:3001/food`);
      const it = data[Symbol.iterator]();
      let actionIt;

      const actionIterator = {
        [Symbol.iterator]() {
          let positions = [...this.actions];
          return {
            [Symbol.iterator]() {
              return this;
            },
            next(...args) {
              if (positions.length > 0) {
                const position = positions.shift();
                const result = position(...args);
                return { value: result, done: false };
              } else {
                return { done: true };
              }
            },
            return() {
              positions = [];
              return { done: true };
            },
            throw(error) {
              console.log(error);
              return { value: undefined, done: true };
            },
          };
        },
        actions: [askForServingSize, displayCalories],
      };

      function askForServingSize(food) {
        readline.question(
          `How many servings did you eat? (as a decimal: 1, 0.5, 1.25, etc.. )`,
          (servingSize) => {
            if (servingSize === "nevermind" || servingSize === "n") {
              actionIt.return();
            } else {
              actionIt.next(servingSize, food);
            }
          }
        );
      }

      async function displayCalories(servingSize, food) {
        const calories = food.calories;
        console.log(
          `${
            food.name
          } with a serving size of ${servingSize} has a ${Number.parseFloat(
            calories * parseInt(servingSize, 10)
          ).toFixed()} calories. `
        );
        const { data } = await Axios.get(`http://localhost:3001/users/1`);
        const usersLog = data.log || [];
        const putBody = {
          ...data,
          log: [
            ...usersLog,
            {
              [Date.now()]: {
                food: food.name,
                servingSize,
                calories: Number.parseFloat(
                  calories * parseInt(servingSize, 10)
                ),
              },
            },
          ],
        };
        await Axios.put(`http://localhost:3001/users/1`, putBody, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        actionIt.next();
        readline.prompt();
      }

      readline.question(`What would you like to log today? `, async (item) => {
        let position = it.next();
        while (!position.done) {
          const food = position.value.name;
          if (food === item) {
            console.log(`${item} has ${position.value.calories} calories`);
            actionIt = actionIterator[Symbol.iterator]();
            actionIt.next(position.value);
          }
          position = it.next();
        }
        readline.prompt();
      });
      break;
    }
    case "log generator": {
      const { data } = await Axios.get(`http://localhost:3001/food`);
      const it = data[Symbol.iterator]();
      let actionIt;

      function* actionGenerator() {
        try {
          const food = yield;
          const servingSize = yield askForServingSize();
          yield displayCalories(servingSize, food);
        } catch (error) {
          console.log({ error });
        }
      }

      function askForServingSize() {
        readline.question(
          `How many servings did you eat? (as a decimal: 1, 0.5, 1.25, etc.. )`,
          (servingSize) => {
            if (servingSize === "nevermind" || servingSize === "n") {
              actionIt.return();
            } else if (typeof +servingSize !== 'number' || Number.isNaN(+servingSize)) {
              actionIt.throw("Please, numbers only");
            } else {
              actionIt.next(servingSize);
            }
          }
        );
      }

      async function displayCalories(servingSize, food) {
        const calories = food.calories;
        console.log(
          `${
            food.name
          } with a serving size of ${servingSize} has a ${Number.parseFloat(
            calories * parseInt(servingSize, 10)
          ).toFixed()} calories. `
        );
        const { data } = await Axios.get(`http://localhost:3001/users/1`);
        const usersLog = data.log || [];
        const putBody = {
          ...data,
          log: [
            ...usersLog,
            {
              [Date.now()]: {
                food: food.name,
                servingSize,
                calories: Number.parseFloat(
                  calories * parseInt(servingSize, 10)
                ),
              },
            },
          ],
        };
        await Axios.put(`http://localhost:3001/users/1`, putBody, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        actionIt.next();
        readline.prompt();
      }

      readline.question(`What would you like to log today? `, async (item) => {
        let position = it.next();
        while (!position.done) {
          const food = position.value.name;
          if (food === item) {
            console.log(`${item} has ${position.value.calories} calories`);
            actionIt = actionGenerator();
            actionIt.next();
            actionIt.next(position.value);
          }
          position = it.next();
        }
        readline.prompt();
      });
      break;
    }
    case `today's log`: {
      readline.question("Email: ", async (emailAddress) => {
        const { data } = await Axios.get(
          `http://localhost:3001/users?email=${emailAddress}`
        );
        const foodLog = data[0].log || [];
        let totalCalories = 0;

        function* getFoodLog() {
          try {
            yield* foodLog;
          } catch (error) {
            console.log("Error reading the food log", { error });
          }
        }

        const logIterator = getFoodLog();

        for (const entry of logIterator) {
          const timestamp = Object.keys(entry)[0];
          if (isToday(new Date(Number(timestamp)))) {
            console.log(
              `${entry[timestamp].food}, ${entry[timestamp].servingSize} serving(s)`
            );
            totalCalories += entry[timestamp].calories;
            if (totalCalories >= 12000) {
              console.log(`Impressive! You've reached 12,000 calories`);
              logIterator.return();
            }
          }
        }
        console.log("-----------------------");
        console.log(`Total Calories: ${totalCalories}`);
        readline.prompt();
      });

      break;
    }
    default: {
      readline.prompt();
      break;
    }
  }
});

function isToday(timestamp) {
  const today = new Date();
  return (
    timestamp.getDate() === today.getDate() &&
    timestamp.getMonth() === today.getMonth() &&
    timestamp.getFullYear() === today.getFullYear()
  );
}
