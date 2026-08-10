# frozen_string_literal: true

# A student's advisors determine their lab and their institution, so the student
# files state the advisors and nothing else about either.
#
# `advisor_slugs` is the single source of truth. From it this derives:
#
#   advisor       "Jiankun Lyu & John Chodera"   the advisors' names
#   lab           "Lyu & Chodera Labs"           their surnames + Lab/Labs
#   institutions  ["Rockefeller", "MSK"]         their institutions, deduped
#
# All three used to be typed into every student file beside the slugs that
# already identified the same people. Checked before removing them: the derived
# value matched the stored one in all 55 advised students, for all three fields.
# That is three chances per student for a hand-edit to drift out of step with
# the faculty file it describes — a student's badge could say Rockefeller while
# their advisor's page said MSK, and nothing would report it.
#
# WHAT A NEW STUDENT NEEDS
# ------------------------
# name, email, cohort, year, undergrad, and `advisor_slugs`. Optionally
# `fellowship`. Nothing else — lab, advisor and institution all follow.
#
# A student with no advisor yet (first-years rotating) has no `advisor_slugs`,
# so nothing can be derived. They declare `institution:` instead — a plain
# string, the one fact about them that does not follow from an advisor — and
# get the "TBD" / "Rotating" placeholders from here rather than from ten copies
# in ten files.
#
# TWO KEYS, ON PURPOSE
# --------------------
# `institution` (singular, a string) is what a FILE may declare, and only when
# there is no advisor. `institutions` (plural, always a list) is what layouts
# read. Keeping the authored and derived names apart is what stops the
# singular/plural ambiguity that has already bitten this repo once, where
# `advisor_slug` beside `advisor_slugs` let a regex match one and miss the other
# and 22 papers went missing from six faculty pages.
#
# `||=` throughout, unlike _plugins/derive_titles.rb: nothing pre-populates
# these, and a file that states one of them explicitly is overriding on purpose
# — which is the escape hatch for a student advised by someone with no page in
# _faculty/, where the name cannot be looked up.
Jekyll::Hooks.register :site, :post_read do |site|
  faculty = {}
  site.collections["faculty"]&.docs&.each do |doc|
    faculty[File.basename(doc.path, ".md")] = doc.data
  end

  site.collections["students"]&.docs&.each do |doc|
    slugs = Array(doc.data["advisor_slugs"]).reject { |s| s.nil? || s.to_s.empty? }
    advisors = slugs.filter_map { |s| faculty[s] }

    if advisors.empty?
      # No advisor yet. The institution is whatever the file declares; the other
      # two are the placeholders the directory and profile render for a student
      # who is still rotating.
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
