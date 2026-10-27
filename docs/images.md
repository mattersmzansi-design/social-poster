# Post images

Every post can get a branded 1080×1080 image (green and gold), made automatically.

## In the sheet
Add a column **image_title** (optional). Write the headline for the image:
- `Inflation ticked up to 4.5%`: just a headline
- `Interest rates | What the hike means for your bond`: small gold label, then the headline

Emoji are removed from images (the font can't draw them); they still appear in the post text.

When an image is made:
- `image_title` is filled in and `media_url` is empty, or
- the post goes to **Instagram** and has no `media_url` (then the first line of `text` is used).

If `media_url` has a link, that picture is used instead and nothing is generated.

For Instagram, the tool uploads the image to your Facebook Page **unpublished** (followers
don't see it) and gives Instagram Meta's link to it. You'll find these under the Page's photos.

## Preview an image
```bash
python -m social_poster.images "Interest rates | What the hike means for your bond" preview.png
```

## Your own design (e.g. from Penpot)
1. In Penpot, make a **1080 × 1080** board with your background, logo and footer.
2. Leave the area from **x 90 to 990** and **y 300 to 860** empty: the headline goes there in white
   (label in gold at the top of that area), so keep that part dark enough for white text.
3. Export the board as PNG and save it in the repo as **`assets/template.png`**
   (GitHub → `assets` folder → Add file → Upload files).

From then on every image uses your template. Delete the file to go back to the built-in design.
