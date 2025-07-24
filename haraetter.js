document.addEventListener('DOMContentLoaded', function () {
  // Znajdź wszystkie elementy z klasą "haraet"
  const haraetDivs = document.querySelectorAll('.haraett');
  
  haraetDivs.forEach(haraetDiv => {
    const newDiv = document.createElement('div');
    newDiv.classList.add('ikonyh');
    
    // Dodaj trzy nowe divy o klasach "1", "2", "3"
    ['haraet-1', 'haraet-2', 'haraet-3'].forEach(className => {
      const innerDiv = document.createElement('div');
      innerDiv.classList.add(className);
      newDiv.appendChild(innerDiv);
    });
    
    // Wstaw nowy div jako dziecko do elementu "haraet"
    haraetDiv.appendChild(newDiv);
  });
});
