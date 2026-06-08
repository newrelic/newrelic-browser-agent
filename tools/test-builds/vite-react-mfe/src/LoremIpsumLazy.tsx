export function LoremIpsumLazy() {
  return (
    <div id="lazy-loaded-content" style={{ marginTop: '20px', padding: '15px', border: '2px solid #4CAF50', borderRadius: '8px' }}>
      <h3>Lazy Loaded Lorem Ipsum</h3>
      <p>
        Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
        doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
        veritatis et quasi architecto beatae vitae dicta sunt explicabo.
      </p>
      <p>
        Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit,
        sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
      </p>
      <button id="lazy-button" onClick={() => {
        console.log("log from lazy")
        fetch('/json')
        throw new Error('lazy test');
      }}>Click Me To Throw An Error From Lazy Loaded Module</button>
    </div>
  );
}