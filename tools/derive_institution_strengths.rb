#!/usr/bin/env ruby
# Derives the `strengths` list for each institution in _data/institutions.yml
# from the actual faculty roster, and prints YAML ready to paste back in.
#
# Why this exists: the homepage institution panel names what each institution is
# strong in. Those claims must come from the roster, not from an author's
# impression of the three places — so the rule is mechanical and stated here:
#
#   strengths = the single most common `research_focus` tag among that
#               institution's faculty, plus the two most common
#               `research_approach` tags, each with the number of faculty
#               carrying it. Ties break alphabetically so reruns are stable.
#
# One focus and two approaches, because a list of three approaches says how the
# science is done without ever saying what it is about. The three are then
# ordered by count, so the panel never shows a smaller number above a larger one.
#
# Ruby rather than Python like the rest of tools/: this needs a YAML parser, and
# Ruby ships with one in the Jekyll toolchain the repo already requires. The
# Python scripts here parse HTML and need no third-party module.
#
# Usage:  ruby tools/derive_institution_strengths.rb

require 'yaml'

ROOT = File.expand_path('..', __dir__)

faculty = Dir[File.join(ROOT, '_faculty', '*.md')].map do |path|
  front = File.read(path).split(/^---\s*$/)[1]
  YAML.safe_load(front)
end

by_inst = faculty.group_by { |f| f['institution'] }

def top(rows, field, n)
  counts = Hash.new(0)
  rows.each { |r| (r[field] || []).each { |v| counts[v] += 1 } }
  counts.sort_by { |label, c| [-c, label] }.first(n)
end

by_inst.sort_by { |inst, rows| [-rows.size, inst.to_s] }.each do |inst, rows|
  picks = (top(rows, 'research_focus', 1) + top(rows, 'research_approach', 2))
          .sort_by { |label, count| [-count, label] }
  puts "# #{inst}: #{rows.size} faculty"
  puts "  strengths:"
  picks.each do |label, count|
    puts "    - label: \"#{label}\""
    puts "      faculty: #{count}"
  end
  puts
end
