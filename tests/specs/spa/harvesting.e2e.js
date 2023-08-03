describe('spa harvesting', () => {
  it('should set correct customEnd value on multiple custom interactions', async () => {
    // interaction3 will eventually be harvested so we need to capture two harvests here

    const [interactionResults1, interactionResults2] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.testHandle.expectInteractionEvents(),
      browser.url(await browser.testHandle.assetURL('spa/multiple-custom-interactions.html'))
    ])

    const interactions = [
      ...interactionResults1.request.body,
      ...interactionResults2.request.body
    ]
    expect(interactions.length).toEqual(4)
    expect(interactions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        customName: 'interaction1',
        children: expect.arrayContaining([expect.objectContaining({
          type: 'customEnd'
        })])
      }),
      expect.objectContaining({
        customName: 'interaction2',
        children: expect.arrayContaining([expect.objectContaining({
          type: 'customEnd'
        })])
      }),
      expect.objectContaining({
        customName: 'interaction3',
        children: expect.not.arrayContaining([expect.objectContaining({
          type: 'customEnd'
        })])
      }),
      expect.objectContaining({
        customName: 'interaction4',
        children: expect.arrayContaining([expect.objectContaining({
          type: 'customEnd'
        })])
      })
    ]))
    interactions
      .filter(interaction => ['interaction1', 'interaction2', 'interaction4'].includes(interaction.customName))
      .forEach(interaction => {
        const customEndTime = interaction.children.find(child => child.type === 'customEnd')
        expect(customEndTime.time).toBeGreaterThanOrEqual(interaction.end)
      })
  })
})
