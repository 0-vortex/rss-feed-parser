import chalk from 'chalk';
import CFonts from 'cfonts';

const header = (input, settings = {}) => CFonts.say(input, {
  font: 'tiny',
  align: 'left',
  colors: ['system'],
  background: 'transparent',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
  gradient: ['#DC5D3E', '#F2D84A'],
  independentGradient: false,
  transitionGradient: true,
  env: 'node',
  ...settings,
});
const hero = (input, settings = {}) => header(input, {
  font: 'block',
  ...settings,
});
const error = (input, ...args) => console.error(chalk.red(input), ...args);
const warning = (input, ...args) => console.warn(chalk.bold.hex('FF8800')(input), ...args);
const log = (input, ...args) => console.log(chalk.bold.green(input), ...args);

export {
  hero,
  header,
  error,
  warning,
  log,
};
