const forma = document.getElementById('forma');
const royxat = document.getElementById('royxat');
const narxFormat = new Intl.NumberFormat('ru-RU');

function korsatXabar(text, tur) {
  const xabar = document.getElementById('xabar');
  xabar.textContent = text;
  xabar.className = tur;
}

// Сервер присылает либо { error }, либо { error, problems: [...] }
function xatoMatni(javobTanasi) {
  if (javobTanasi && Array.isArray(javobTanasi.problems) && javobTanasi.problems.length > 0) {
    return javobTanasi.problems.join('; ');
  }
  if (javobTanasi && javobTanasi.error) {
    return javobTanasi.error;
  }
  return "Noma'lum xatolik";
}

function holatSinfi(mahsulot) {
  if (mahsulot.qty === 0) return 'tugagan';
  if (mahsulot.qty <= 3) return 'kam';
  return 'yetarli';
}

function sonBloki(sinf, son, birlik) {
  const blok = document.createElement('div');
  blok.className = sinf;

  const sonElementi = document.createElement('span');
  sonElementi.className = 'son';
  sonElementi.textContent = son;

  const birlikElementi = document.createElement('span');
  birlikElementi.className = 'birlik';
  birlikElementi.textContent = birlik;

  blok.append(sonElementi, birlikElementi);
  return blok;
}

function qatorYasash(mahsulot) {
  const li = document.createElement('li');
  li.className = `qator holat--${holatSinfi(mahsulot)}`;

  const chap = document.createElement('div');
  chap.className = 'qator__nomi';

  const nomi = document.createElement('div');
  nomi.className = 'nomi';
  nomi.textContent = mahsulot.name;

  const tafsilot = document.createElement('div');
  tafsilot.className = 'tafsilot';

  const turkum = document.createElement('span');
  turkum.className = 'chip';
  turkum.textContent = mahsulot.category;
  tafsilot.appendChild(turkum);

  if (!mahsulot.inStock) {
    const sotuvdaYoq = document.createElement('span');
    sotuvdaYoq.className = 'chip chip--yoq';
    sotuvdaYoq.textContent = "sotuvda yo'q";
    tafsilot.appendChild(sotuvdaYoq);
  }

  chap.append(nomi, tafsilot);

  const tugmalar = document.createElement('div');
  tugmalar.className = 'tugmalar';

  const qoshTugma = document.createElement('button');
  qoshTugma.type = 'button';
  qoshTugma.className = 'tugma tugma--qosh';
  qoshTugma.textContent = '+1';
  qoshTugma.setAttribute('aria-label', `${mahsulot.name}: miqdorni bittaga oshirish`);
  qoshTugma.addEventListener('click', () => qtyniOshir(mahsulot, qoshTugma));

  const ochirTugma = document.createElement('button');
  ochirTugma.type = 'button';
  ochirTugma.className = 'tugma tugma--ochir';
  ochirTugma.textContent = "O'chirish";
  ochirTugma.setAttribute('aria-label', `${mahsulot.name} mahsulotini o'chirish`);
  ochirTugma.addEventListener('click', () => ochirishniBoshqar(mahsulot, ochirTugma));
  ochirTugma.addEventListener('blur', () => tasdiqniBekorQil(ochirTugma));

  tugmalar.append(qoshTugma, ochirTugma);

  li.append(
    chap,
    sonBloki('qator__narx', narxFormat.format(mahsulot.price), "so'm"),
    sonBloki('qator__miqdor', mahsulot.qty, 'dona'),
    tugmalar,
  );

  return li;
}

// Пока запрос в пути, кнопки строки выключены: иначе два клика отправят два запроса
function qatorTugmalari(tugma, ochiqmi) {
  const qator = tugma.closest('li');
  if (!qator) return;

  qator.querySelectorAll('button').forEach((t) => {
    t.disabled = !ochiqmi;
  });
}

function xulosaYangila(mahsulotlar) {
  const xulosa = document.getElementById('xulosa');

  if (mahsulotlar.length === 0) {
    xulosa.textContent = "ombor bo'sh";
    return;
  }

  const turkumlar = new Set(mahsulotlar.map((mahsulot) => mahsulot.category));
  const kamQolgan = mahsulotlar.filter((mahsulot) => mahsulot.qty <= 3).length;
  xulosa.textContent = `${mahsulotlar.length} mahsulot · ${turkumlar.size} turkum · ${kamQolgan} tasi kam qolgan`;
}

function yuklanmoqdaKorsat() {
  const skeletlar = [];

  for (let i = 0; i < 3; i += 1) {
    const li = document.createElement('li');
    li.className = 'skelet';

    const keng = document.createElement('div');
    keng.className = 'skelet__chiziq';

    const tor = document.createElement('div');
    tor.className = 'skelet__chiziq skelet__chiziq--tor';

    li.append(keng, tor);
    skeletlar.push(li);
  }

  royxat.replaceChildren(...skeletlar);
}

function boshQatorKorsat() {
  const li = document.createElement('li');
  li.className = 'bosh';
  li.textContent = "Ombor bo'sh. Yuqoridagi forma orqali birinchi mahsulotni qo'shing.";
  royxat.replaceChildren(li);
}

function xatoQatoriKorsat(text) {
  const li = document.createElement('li');
  li.className = 'xato-qatori';

  const matn = document.createElement('div');
  matn.textContent = text;

  const qaytaTugma = document.createElement('button');
  qaytaTugma.type = 'button';
  qaytaTugma.className = 'tugma';
  qaytaTugma.textContent = 'Qayta urinish';
  qaytaTugma.addEventListener('click', royxatniYukla);

  li.append(matn, qaytaTugma);
  royxat.replaceChildren(li);
}

async function royxatniYukla() {
  if (royxat.children.length === 0) {
    yuklanmoqdaKorsat();
  }

  try {
    const javob = await fetch('/mahsulotlar');

    if (!javob.ok) {
      xatoQatoriKorsat(xatoMatni(await javob.json()));
      return;
    }

    const mahsulotlar = await javob.json();
    xulosaYangila(mahsulotlar);

    if (mahsulotlar.length === 0) {
      boshQatorKorsat();
      return;
    }

    royxat.replaceChildren(...mahsulotlar.map(qatorYasash));
  } catch (error) {
    xatoQatoriKorsat("Server bilan aloqa yo'q. Server ishlab turganini tekshiring.");
  }
}

forma.addEventListener('submit', async (event) => {
  event.preventDefault();

  // forma.elements — надёжный способ достать поля по атрибуту name
  const maydonlar = forma.elements;
  const yangiMahsulot = {
    name: maydonlar.name.value,
    category: maydonlar.category.value,
    price: Number(maydonlar.price.value),
    qty: Number(maydonlar.qty.value),
  };

  const yuborTugma = forma.querySelector('button[type="submit"]');
  yuborTugma.disabled = true;

  try {
    const javob = await fetch('/mahsulotlar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(yangiMahsulot),
    });

    const natija = await javob.json();

    if (!javob.ok) {
      korsatXabar(xatoMatni(natija), 'xato');
      return;
    }

    forma.reset();
    korsatXabar(`"${natija.name}" ro'yxatga qo'shildi.`, 'ok');
    await royxatniYukla();
  } catch (error) {
    korsatXabar("Server bilan aloqa yo'q. Server ishlab turganini tekshiring.", 'xato');
  } finally {
    yuborTugma.disabled = false;
  }
});

// Первый клик только предупреждает, удаляет второй: строку легко задеть случайно
function ochirishniBoshqar(mahsulot, tugma) {
  if (tugma.dataset.tasdiq !== '1') {
    tugma.dataset.tasdiq = '1';
    tugma.textContent = 'Aniqmi?';
    korsatXabar(`"${mahsulot.name}" o'chiriladi. Tasdiqlash uchun yana bosing.`, 'ogoh');
    return;
  }

  mahsulotniOchir(mahsulot, tugma);
}

function tasdiqniBekorQil(tugma) {
  if (tugma.dataset.tasdiq === '1') {
    delete tugma.dataset.tasdiq;
    tugma.textContent = "O'chirish";
  }
}

async function mahsulotniOchir(mahsulot, tugma) {
  qatorTugmalari(tugma, false);

  try {
    const javob = await fetch(`/mahsulotlar/${mahsulot._id}`, { method: 'DELETE' });
    const natija = await javob.json();

    if (javob.ok) {
      korsatXabar(`"${natija.name}" o'chirildi.`, 'ok');
    } else {
      korsatXabar(xatoMatni(natija), 'xato');
    }

    await royxatniYukla();
  } catch (error) {
    korsatXabar("Server bilan aloqa yo'q. Server ishlab turganini tekshiring.", 'xato');
    qatorTugmalari(tugma, true);
  }
}

async function qtyniOshir(mahsulot, tugma) {
  qatorTugmalari(tugma, false);

  try {
    const javob = await fetch(`/mahsulotlar/${mahsulot._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty: mahsulot.qty + 1 }),
    });

    const natija = await javob.json();

    if (javob.ok) {
      korsatXabar(`"${natija.name}" — endi ${natija.qty} dona.`, 'ok');
    } else {
      korsatXabar(xatoMatni(natija), 'xato');
    }

    await royxatniYukla();
  } catch (error) {
    korsatXabar("Server bilan aloqa yo'q. Server ishlab turganini tekshiring.", 'xato');
    qatorTugmalari(tugma, true);
  }
}

royxatniYukla();
