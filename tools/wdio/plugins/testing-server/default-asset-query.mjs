const query = {
  loader: 'spa',
  init: {
    ajax: { deny_list: [], harvestTimeSeconds: 5 },
    jserrors: { harvestTimeSeconds: 5 },
    metrics: { harvestTimeSeconds: 5 },
    page_action: { harvestTimeSeconds: 5 },
    page_view_timing: { harvestTimeSeconds: 5 },
    session_trace: { harvestTimeSeconds: 5 },
    spa: { harvestTimeSeconds: 5 }
  }
}

export default query
