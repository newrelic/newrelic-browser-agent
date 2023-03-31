import { faker } from '@faker-js/faker'
import { InteractionNode } from './interaction-node'

test('finishing node with cancelled parent should not throw an error', () => {
  const interaction = {
    remaining: 0,
    onNodeAdded: jest.fn(),
    checkFinish: jest.fn()
  }
  const interactionRootNode = new InteractionNode(interaction, null, 'interaction', faker.date.past().getUTCSeconds())
  const interactionNode = interactionRootNode.child('test', faker.date.past().getUTCSeconds(), 'test', false)

  interactionRootNode.cancel()
  interactionNode.finish()

  expect(interactionRootNode.children.length).toEqual(0)
})
