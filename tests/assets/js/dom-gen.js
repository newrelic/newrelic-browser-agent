/**
 * This file provides a way to dynamically generate a random dom.
 * For large doms, it is recommended to load this script on a test
 * page and copy out the generated dom.
 * Credit: https://github.com/erykpiast/random-dom-generator
 */

window.generateDOM = (function () {
  const uuidv4Template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'

  function getRandomValue (valueTable, tableIndex) {
    if (valueTable) {
      /**
       * The value table could have any number value in the given index. Use
       * bitwise AND to ensure the value we generate is a valid hex value.
       * x & 15 will ensure the value converted to hex using `toString(16)`
       * falls within the range of 0 and 15 inclusively.
       */
      return valueTable[tableIndex] & 15
    } else {
      return Math.random() * 16 | 0
    }
  }

  function generateUuid () {
    let randomValueTable
    let randomValueIndex = 0
    if (crypto && crypto.getRandomValues) {
      // eslint-disable-next-line
      randomValueTable = crypto.getRandomValues(new Uint8Array(31))
    }

    return uuidv4Template.split('').map(templateInput => {
      if (templateInput === 'x') {
        return getRandomValue(randomValueTable, ++randomValueIndex).toString(16)
      } else if (templateInput === 'y') {
        // this is the uuid variant per spec (8, 9, a, b)
        // % 4, then shift to get values 8-11
        return (getRandomValue() & 0x3 | 0x8).toString(16)
      } else {
        return templateInput
      }
    }).join('')
  }

  function _random (min, max) {
    return Math.round(min + (Math.random() * (max - min)))
  }

  function _createNode (tag, attrs) {
    var node = document.createElement(tag)
    node.innerText = generateUuid()

    for (var attrName in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, attrName)) {
        node.setAttribute(attrName, attrs[attrName])
      }
    }

    return node
  }

  function _createArray (length, defaultValue) {
    var arr = []

    while (length) {
      arr[--length] = defaultValue
    }

    return arr
  }

  function randomDOM (root, amount, maxDepth, maxPerLevel, maxAttrs, tags, attrs) {
    if (amount > Math.pow(maxPerLevel, maxDepth)) {
      throw new Error('it is not possible to create ' + amount + ' nodes with ' + maxDepth + ' depth and ' + maxPerLevel + ' nodes per level')
    }

    var current = root
    var currentDepth = 0
    var goDeeper
    var tag
    var currentAttrs
    var tagsLen = tags.length
    var attrsNames = Object.keys(attrs)
    var attrsLen = attrsNames.length

    function _drawAttrs () {
      var attrIndex = _random(0, attrsLen - 1)
      var attrsValues = attrs[attrsNames[attrIndex]]

      currentAttrs[attrsNames[attrIndex]] = attrsValues[_random(0, attrsValues.length - 1)]
    }

    while (amount) {
      tag = tags[_random(0, tagsLen - 1)]
      currentAttrs = { }
      _createArray(Math.ceil(_random(0, maxAttrs))).forEach(_drawAttrs)

      goDeeper = _random(0, maxDepth) > currentDepth

      if (goDeeper || !currentDepth) {
        currentDepth++

        if (current.children.length < maxPerLevel) {
          current.appendChild(current = _createNode(tag, currentAttrs))
        } else {
          current = current.children[_random(0, current.children.length - 1)]

          continue
        }
      } else {
        if (current.parentNode.children.length < maxPerLevel) {
          current.parentNode.appendChild(current = _createNode(tag, currentAttrs))
        } else if (currentDepth) {
          current = current.parentNode

          currentDepth--

          continue
        } else {
          current = current.children[_random(0, current.children.length - 1)]

          currentDepth++

          continue
        }
      }

      amount--
    }

    return root
  }

  return randomDOM
})()
