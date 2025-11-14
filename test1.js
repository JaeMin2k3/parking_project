const date = new Date().toISOString();
  const day = date.trim().split('T')[0];
  const hour =date.trim().split('T')[1].split('.')[0];
  console.log(day + " " + hour);