using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class DeliveryGetByVehicleRegistrationNumber : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        Response.Headers.Add("Content-type", "text/json");
        Response.Headers.Add("Content-type", "application/json");
    }
}