# frozen_string_literal: true

# A student's advisors determine their lab and institution, so student files
# list only the advisors, in `advisor_slugs` (faculty file names, without .md).
# From those this derives, before anything renders:
#
#   advisor       "Jiankun Lyu & John Chodera"   the advisors' names
#   lab           "Lyu & Chodera Labs"           their surnames + Lab/Labs
#   institutions  ["Rockefeller", "MSK"]         their institutions, deduped
#
# WHAT A NEW STUDENT NEEDS
# ------------------------
# name, email, cohort, year, undergrad, `advisor_slugs`, and optionally
# `fellowship`. A student with no advisor yet (a rotating first-year) has an
# empty `advisor_slugs` and declares `institution:` (a single string) instead;
# they get the "TBD" / "Rotating" placeholders from here.
#
# `institution` (singular) is only ever authored; `institutions` (plural, always
# a list) is only ever derived, and is what layouts read.
#
# A file that sets advisor, lab or institutions itself overrides the derived
# value (`||=`). That is the escape hatch for an advisor who has no page in
# _faculty/. A slug that matches no faculty file stops the build, for students
# and for _data/alumni.yml alike: otherwise a typo or a renamed faculty file
# would quietly show the student as "TBD" or unlink an alumnus's advisor.
Jekyll::Hooks.register :site, :post_read do |site|
  faculty = {}
  site.collections["faculty"]&.docs&.each do |doc|
    faculty[File.basename(doc.path, ".md")] = doc.data
  end

  Array(site.data["alumni"]).each do |alum|
    unknown = Array(alum["advisor_slugs"]).reject { |s| s.to_s.empty? || faculty.key?(s) }
    next if unknown.empty?

    raise Jekyll::Errors::FatalException,
          "_data/alumni.yml (#{alum['name']}): advisor_slugs #{unknown.inspect} match no file in _faculty/"
  end

  site.collections["students"]&.docs&.each do |doc|
    slugs = Array(doc.data["advisor_slugs"]).reject { |s| s.nil? || s.to_s.empty? }
    unknown = slugs.reject { |s| faculty.key?(s) }
    unless unknown.empty?
      raise Jekyll::Errors::FatalException,
            "#{doc.relative_path}: advisor_slugs #{unknown.inspect} match no file in _faculty/"
    end
    advisors = slugs.map { |s| faculty[s] }

    if advisors.empty?
      doc.data["advisor"] ||= "TBD"
      doc.data["lab"] ||= "Rotating"
      doc.data["institutions"] ||= Array(doc.data["institution"]).reject { |i| i.to_s.empty? }
      next
    end

    doc.data["advisor"] ||= advisors.map { |f| f["name"] }.join(" & ")

    surnames = advisors.map { |f| f["name"].to_s.split.last }
    doc.data["lab"] ||= surnames.join(" & ") + (surnames.size > 1 ? " Labs" : " Lab")

    doc.data["institutions"] ||= advisors.map { |f| f["institution"] }.compact.uniq
  end
end
