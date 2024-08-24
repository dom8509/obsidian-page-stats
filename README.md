# Page Stats

With this plugin you get an additional panel that shows the progressive summarization status of the current document.

The plugin expects that you have (eg. Readwise Highlights) in the following format:
> This is a first book note from readwise

Some comment abuout the hightlight

## Description of the Layers
**Layer 1:** All Highlights starting with a ">" (see above)

**Layer 2:** Bold text inside the layer 1 hightlights ("**")

**Layer 3:** Highlighted text in the layer 1 highlights ("==")

> ℹ️ How Layer 2 and Layer 3 are handled can be changed in the plugin settings.


For more information about how progressive summarization works have a look at the description of Tiago Forte: [Progressive Summarization: A Practical Technique for Designing Discoverable Notes](https://fortelabs.com/blog/progressive-summarization-a-practical-technique-for-designing-discoverable-notes/)

The plugin is not yet available in [Obsidian Community Plugins](https://obsidian.md/plugins) but you can install it with `BRAT` for now.

After install, open command palette to enable this plugin, then the views will be default registered in the right panel. 

```bash
Enable Command: "Page Stats: Enable Plugin"
``````