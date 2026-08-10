# frozen_string_literal: true

# Derives the `title` of every faculty and student page from the data already in
# the file, so it does not have to be stored twice.
#
# WHY A PLUGIN AND NOT LIQUID
# ---------------------------
# jekyll-seo-tag is what emits <title>, and it reads exactly one thing:
# page["title"] (see jekyll-seo-tag/lib/jekyll-seo-tag/drop.rb, #page_title).
# A layout cannot write back to `page`, so there is no template-level way to
# say "the title is name + degree" — which is why every _faculty/*.md used to
# carry a `title:` that restated `name` and `degree` verbatim, in all 67 files.
#
# Plugins are available here because the GitHub Actions workflow runs a plain
# `bundle exec jekyll build`, not the GitHub Pages builder that rejects them.
# jekyll-scholar, which is not on the Pages allowlist, already depends on that.
#
# WHY :post_read AND WHY `=` RATHER THAN `||=`
# --------------------------------------------
# :post_read runs after every document is read and before anything renders, so
# the value is in place by the time seo-tag looks for it.
#
# The assignment must be unconditional. Jekyll pre-populates the key itself —
# `data["title"] ||= Utils.titleize_slug(slug)` in jekyll/document.rb — so by the
# time this hook runs, `title` is ALWAYS already set to the titleized filename.
# `||=` here would silently do nothing at all.
#
# That fallback is also why this hook is worth having for students, who never
# had a `title:` key: titleizing the filename drops anything the slug does not
# carry. `michelle-guo.md` rendered <h1>Michelle (Ruiyang) Guo</h1> under
# <title>Michelle Guo</title>, and `zhiang-chen.md` titled Zhi'ang Chen as
# "Zhiang Chen". Nine students were affected. Deriving from `name` fixes all of
# them and adds no front matter.
#
# If a file ever needs a title that is not this formula, it cannot express that
# through front matter any more — add the exception here instead.
Jekyll::Hooks.register :site, :post_read do |site|
  site.collections["faculty"]&.docs&.each do |doc|
    name = doc.data["name"]
    next if name.nil? || name.empty?

    degree = doc.data["degree"]
    doc.data["title"] = degree.nil? || degree.empty? ? name : "#{name}, #{degree}"
  end

  site.collections["students"]&.docs&.each do |doc|
    name = doc.data["name"]
    doc.data["title"] = name unless name.nil? || name.empty?
  end
end
