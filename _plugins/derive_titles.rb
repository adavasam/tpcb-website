# frozen_string_literal: true

# Sets the `title` of faculty and student pages from their front matter:
# "Name, Degree" for faculty and "Name" for students.
#
# jekyll-seo-tag builds <title> from page["title"], and a layout cannot write
# to `page`, so this has to happen before rendering. It must assign with `=`:
# Jekyll has already set `title` to the titleized file name by :post_read, and
# that drops anything the slug cannot carry ("Michelle (Ruiyang) Guo" would
# become "Michelle Guo").
#
# A page that needs a different title needs an exception here; a `title:` key in
# its front matter would be overwritten.
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
