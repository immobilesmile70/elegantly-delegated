const escape = text => String(text).replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function renderUserCard(person) {
  return '<article class="card" data-role="user"><h2>' + escape(person.name) +
    '</h2><p>' + escape(person.title) + '</p></article>';
}

export function renderAdminCard(person) {
  return '<article class="card" data-role="admin"><h2>' + escape(person.name) +
    '</h2><p>' + escape(person.title) + '</p></article>';
}
