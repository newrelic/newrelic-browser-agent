/* eslint-disable */
export function detailedCheckRum ({ query, body }, expected = {query: {}, body: {}}, { liteAgent } = {}) {
  const {a, be, ck, dc, fe, perf, ref, rst, s, t, v, ap, qt, ac, us, pr, tt, xx, ua, at} = expected.query
  const {ja} = expected.body

  /** if the prop is supplied in `expected`, check that the query has it and it matches value */
  expect(query).toMatchObject({
    ...(a && {a}),
    ...(ac && {ac}),
    ...(ap && {ap}),
    ...(at && {at}),
    ...(be && {be}),
    ...(ck && {ck}),
    ...(dc && {dc}),
    ...(fe && {fe}),
    ...(perf && {perf}),
    ...(pr && {pr}),
    ...(qt && {qt}),
    ...(ref && {ref}),
    ...(rst && {rst}),
    ...(s && {s}),
    ...(t && {t}),
    ...(tt && {tt}),
    ...(ua && {ua}),
    ...(us && {us}),
    ...(v && {v}),
    ...(xx && {xx}),
  })
  if (ja) expect(body).toEqual({ja})
  else expect(body).toEqual('')
}
