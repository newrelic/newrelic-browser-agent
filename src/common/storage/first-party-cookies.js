export class FirstPartyCookies {
  constructor (domain) {
    this.domain = domain
  }

  get (name) {
    try {
      var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
      if (match) return match[2]
    } catch (err) {
      // Error is ignored
      return ''
    }
  }

  set (key, value) {
    try {
      const cookie = `${key}=${value}; Domain=${this.domain}; Path=/`
      document.cookie = cookie
    } catch (err) {
      // Error is ignored
    }
  }

  remove (key) {
    try {
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; Domain=${this.domain}; Path=/`
    } catch (err) {
      // Error is ignored
    }
  }
}
