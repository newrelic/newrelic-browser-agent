export function toTitleCase (str, regex = /\w*/g) {
  return str.replace(
    regex,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  )
}
