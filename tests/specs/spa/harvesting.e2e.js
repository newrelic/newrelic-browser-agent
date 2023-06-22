describe('spa harvesting', () => {
  it('should set correct customEnd value on multiple custom interactions', async () => {
    const [interactionResults] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.url(await browser.testHandle.assetURL('spa/multiple-custom-interactions.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    const interactions = interactionResults.request.body
    expect(interactions.length).toEqual(3)
    expect(interactions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        customName: 'interaction1'
      }),
      expect.objectContaining({
        customName: 'interaction2'
      }),
      expect.objectContaining({
        customName: 'interaction4'
      })
    ]))
    interactions.forEach(interaction => {
      const customEndTime = interaction.children.find(child => child.type === 'customEnd')
      expect(customEndTime.time).toBeGreaterThanOrEqual(interaction.end)
    })
  })
})
