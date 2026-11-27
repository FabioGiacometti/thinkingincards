# Homepage scroll story — draft (27 November 2026)

The homepage tells one story with one sample project (commerce: Client, Order, Product, Provider, Payment).
Layout: a **sticky stage** on one side that changes as **text steps** scroll beside it (stacked on mobile). The stage
looks like the **real app**: same cards, colors and columns, so the story is also proof of the product.

Headline idea it embodies: **Product structure first.** Screens come at the end.

## Scenes

| # | Text step (left) | Stage (right) |
|---|---|---|
| 0 | **Hero.** Eyebrow "Object-Oriented UX, in practice". H1 "Product structure first." Subtitle: before anyone designs a screen, your team agrees on what the product is made of. **Start**. | An abstract map of the product: five nodes (Client, Order, Product, Provider, Payment) joined by lines. Quiet, no detail yet. |
| 1 | **Name the things.** Start from the things people talk about. | The camera moves into one node, **Product**, which opens into an empty object column, as on the Board. |
| 2 | **Fill them in.** Write down what each one holds. | Cards drop into Product: attributes (Image, Name, Description, Price), metadata (Stock, Last updated), actions (Buy, Add to cart), each in its real card color. |
| 3 | **Nest them.** Connect them the way people think about them. | Product shrinks into a **nested object card** and slides into **Order**, a more general object. Then Order shrinks into **Client**. The camera pulls back: the five objects as columns, with nested cards. The abstract map from the hero, now concrete. |
| 4 | **Decide what people can do, and who.** | The action cards light up; a small role grid fills in (who can Create order, who can Refund). |
| 5 | **One object, many views.** | The Order object becomes a list row, a detail and a summary card: the same Order in three places. |
| 6 | **Screens follow.** Design the screens on a structure the team already agreed on. | The views assemble into components and two screens: Orders list and Checkout. Ends on **Start**. |

After the story: a small section "Works with your AI agent" (links to the Claude and ChatGPT plugins, generic MCP
access; only what works today), the short privacy line, the FAQ, the OOUX credit.

## Rules

- People first: the story is about a team agreeing on the structure. AI is an extra, after the story.
- Every frame shows something the app really does. No claim of building screens from the model until we test it:
  scene 6 shows the team designing screens on the model, not the app generating them.
- Respect reduced motion: without animation, each step shows its final frame.
- The current interactive example (What / How / With / Who) and the hero video are replaced by this story.

## Open questions

- Exact copy for each text step.
- Which roles appear in scene 4.
- Whether people can click around the finished project at the end.
