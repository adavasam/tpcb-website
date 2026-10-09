# Run: bundle exec ruby tools/tests/test_template_contracts.rb
# Uses actual hooks and Liquid includes with synthetic records; no site build.
require 'jekyll'
require 'tmpdir'
require 'json'
require 'open3'

ROOT = File.expand_path('../..', __dir__)
Doc = Struct.new(:path, :data) do
  def relative_path = path
end
Collection = Struct.new(:docs)
FixtureSite = Struct.new(:collections, :data)

Dir[File.join(ROOT, '_plugins', '*.rb')].sort.each { |path| require path }
HOOKS = Jekyll::Hooks.instance_variable_get(:@registry).dig(:site, :post_read)
              .select { |hook| hook.source_location.first.start_with?(File.join(ROOT, '_plugins')) }

def assert(condition, message = 'assertion failed')
  raise message unless condition
end

def assert_raises(type)
  begin
    yield
  rescue type
    return
  end
  raise "expected #{type}"
end

def derive(student, faculty = [], alumni = [])
  doc = Doc.new('_students/example.md', student)
  site = FixtureSite.new({
    'students' => Collection.new([doc]),
    'faculty' => Collection.new(faculty.map { |slug, data| Doc.new("_faculty/#{slug}.md", data) })
  }, { 'alumni' => alumni })
  HOOKS.each { |hook| hook.call(site) }
  student
end

def source(path)
  File.read(File.join(ROOT, path)).sub(/\A---\s*\n.*?\n---\s*\n/m, '')
end

def render(path, vars)
  Liquid::Template.parse(source(path)).render!(vars, registers: { site: $liquid_site }, strict_filters: true)
end

tests = {}
tests['rotating student and derived co-advisors preserve institution ordering'] = proc do
  rotating = derive({ 'name' => 'Example Student', 'institution' => 'WCM' })
  assert(rotating.values_at('advisor', 'lab', 'institutions') == ['TBD', 'Rotating', ['WCM']])
  faculty = [
    ['alpha', { 'name' => 'First Alpha', 'institution' => 'WCM' }],
    ['beta', { 'name' => 'Second Beta', 'institution' => 'WCM' }]
  ]
  student = derive({ 'name' => 'Example Student', 'advisor_slugs' => ['alpha', 'beta'] }, faculty)
  assert(student.values_at('advisor', 'lab', 'institutions') == ['First Alpha & Second Beta', 'Alpha & Beta Labs', ['WCM']])
end
tests['unknown student and alumni advisor slugs fail early'] = proc do
  assert_raises(Jekyll::Errors::FatalException) { derive({ 'name' => 'Example Student', 'advisor_slugs' => ['missing'] }) }
  assert_raises(Jekyll::Errors::FatalException) { derive({ 'name' => 'Example Student' }, [], [{ 'name' => 'Example Alum', 'advisor_slugs' => ['missing'] }]) }
end
tests['profile title uses authored name, including parentheses'] = proc do
  student = derive({ 'name' => 'Example (Chosen) Student', 'title' => 'Filename' })
  assert(student['title'] == 'Example (Chosen) Student')
end
tests['advisor include preserves co-advisor fallback without carrying previous link'] = proc do
  html = render('_includes/advisor-links.html', {
    'include' => { 'names' => 'First Alpha & External Mentor', 'slugs' => ['alpha', ''] },
    'site' => { 'faculty' => [{ 'slug' => 'alpha', 'name' => 'First Alpha', 'url' => '/faculty/alpha/' }] }
  })
  assert(html.scan('<a ').length == 1 && html.include?('External Mentor'))
  assert(html.include?('/tpcb-website/faculty/alpha/'))
end
tests['publication list escapes citation fields and respects display limit'] = proc do
  entries = { 'one' => { 'title' => '<em>Literal</em>', 'journal' => 'A & B', 'year' => '2020' }, 'two' => { 'title' => 'Second' } }
  html = render('_includes/publication-list.html', {
    'include' => { 'keys' => %w[one two], 'limit' => 1 },
    'site' => { 'data' => { 'publications' => { 'entries' => entries } } }
  })
  assert(html.include?('&lt;em&gt;Literal&lt;/em&gt;') && html.include?('A &amp; B'))
  assert(!html.include?('Second') && html.include?('1 more in the full publication list'))
end
tests['explicit external advisor appears consistently on profile and directory'] = proc do
  student = derive({ 'name' => 'Example Student', 'advisor_slugs' => [],
    'advisor' => 'Confirmed External Mentor', 'lab' => 'External Lab', 'institutions' => ['WCM'],
    'profile' => { 'image' => 'logos/headshot-placeholder.png' }, 'cohort' => 2026 })
  vars = { 'page' => student, 'site' => { 'students' => [student], 'faculty' => [], 'data' => { 'institutions' => [], 'publications' => {} } } }
  assert(render('_layouts/profile.html', vars).include?('Confirmed External Mentor'))
  directory = render('_layouts/students-directory.html', vars)
  sponsor = directory[/<p class="student-sponsor-line">(.*?)<\/p>/m, 1]
  assert(sponsor.include?('Confirmed External Mentor') && !sponsor.include?('TBD'), 'directory discards confirmed advisor override')
end
tests['accented student name finds the publication key produced by the index'] = proc do
  student = derive({ 'name' => "  Élodie  Example-Smith. ", 'profile' => { 'image' => 'logos/headshot-placeholder.png' } })
  pubs = { 'by_person' => { 'elodie example smith' => ['example'] }, 'entries' => { 'example' => { 'title' => 'Synthetic publication' } } }
  html = render('_layouts/profile.html', { 'page' => student, 'site' => { 'data' => { 'publications' => pubs } } })
  assert(html.include?('Synthetic publication'), 'Liquid lookup misses normalized publication key')
end
tests['publication key matches tools/build_pub_index.py norm for tricky names'] = proc do
  names = ["  \u00c9lodie  Example-Smith. ", "Stra\u00dfe", "\u03a3\u039f\u03a6\u0399\u0391 \u039f\u0394\u03a5\u03a3\u03a3\u0395\u0391\u03a3",
           "\u0130lknur I\u015f\u0131k", "Hat\u00ecce D\u00ecdar \u00c7\u00ecft\u00e7\u00ec", "Zo\u00eb O'Brien", "\ufb01ona",
           "Anne\u00a0Marie", "Nguy\u1ec5n Th\u1ecb", "J.-P. Sartre", "Kim\u3000Lee", "Ana\u2028Lu\u00edsa", "Ma\u0301ria"]
  ruby_keys = names.map { |name| derive({ 'name' => name })['publication_key'] }
  script = 'import json, sys; sys.path.insert(0, sys.argv[1]); import build_pub_index as b; ' \
           'print(json.dumps([b.norm(n) for n in json.load(sys.stdin)]))'
  out, status = Open3.capture2('python3', '-c', script, File.join(ROOT, 'tools'), stdin_data: JSON.generate(names))
  assert(status.success?, 'python3 norm failed')
  python_keys = JSON.parse(out)
  names.each_index { |i| assert(ruby_keys[i] == python_keys[i], "#{names[i].inspect}: Ruby #{ruby_keys[i].inspect} != Python #{python_keys[i].inspect}") }
end
tests['rotating student still shows TBD in the directory'] = proc do
  student = derive({ 'name' => 'Example Student', 'profile' => { 'image' => 'logos/headshot-placeholder.png' } })
  html = render('_layouts/students-directory.html', { 'page' => {}, 'site' => { 'students' => [student], 'data' => { 'institutions' => [] } } })
  assert(html.include?('<span class="student-rotating">TBD</span>'))
end

failures = 0
Dir.mktmpdir('tpcb-liquid-fixtures') do |directory|
  $liquid_site = Jekyll::Site.new(Jekyll.configuration('source' => ROOT, 'destination' => directory, 'quiet' => true))
  tests.each do |name, check|
    begin
      check.call
      puts "PASS #{name}"
    rescue StandardError => error
      failures += 1
      warn "FAIL #{name}: #{error.class}: #{error.message}"
    end
  end
end
puts "#{tests.size - failures}/#{tests.size} hook/template fixtures passed"
exit(failures.zero? ? 0 : 1)
