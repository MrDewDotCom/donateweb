import { useEffect, useState } from "react";
import { getRecentDonations }
    from "../services/donation.service";

export default function RecentDonations() {

    const [donations, setDonations] =
        useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res =
            await getRecentDonations();

        setDonations(res.data);
    };

    return (
        <div>
            <h2>
                Recent Donations
            </h2>

            {donations.map((d) => (
                <div key={d.id}>
                    <p>
                        {d.name}
                        {" - "}
                        {d.amount} บาท
                    </p>
                </div>
            ))}
        </div>
    );
}