import Handlebars from 'handlebars'

Handlebars.registerHelper('isEnvironment', (environment, ...target) => {
  if (!Array.isArray(target)) target = [target]
  target = target.slice(0, -1)
  return target.includes(environment)
})

export default Handlebars
