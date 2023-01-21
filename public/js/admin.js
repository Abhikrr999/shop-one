const deleteProduct = (btn) => {
  console.log(btn);

  const prodId = btn.parentNode.querySelector("[name= productId]").value;
  const csrf = btn.parentNode.querySelector("[name=_csrf]").value;
  const productTobeDeleted = btn.closest("article");

  fetch("/admin/product/" + prodId, {
    method: "DELETE",
    headers: {
      "csrf-token": csrf,
    },
  })
    .then((result) => {
      console.log(result);
      return result.json();
    })
    .then(data =>{
      console.log(data);
      productTobeDeleted.parentNode.removeChild(productTobeDeleted);  
    })
    .catch((err) => {
      console.log(err);
    });
};
